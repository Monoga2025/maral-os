"""
Sprint 0 — T0.2: Backfill de clientes desde Merlin hacia MARAL OS

Lee el historial completo de ventas en Merlin y actualiza la tabla Client en PostgreSQL con:
  - interestTags   : qué categorías de producto ha comprado (VHF, UHF, CABLE, BASE, DIPOLO, etc.)
  - lifetimeValue  : suma total histórica de ventas en COP
  - lastOrderAt    : fecha de la última compra
  - segment        : IM / DS / CF inferido de la categoría en Merlin (CXCClientes)

Requiere:
  pip install pyodbc psycopg2-binary python-dotenv

Uso:
  cd backend
  python scripts/merlin-backfill.py [--dry-run]
"""
import sys
import os
import argparse
import pyodbc
import psycopg2
import psycopg2.extras
from datetime import datetime

# ── Config ─────────────────────────────────────────────────────
MERLIN_DB = r"C:\Merlin\Merlin4.8\Dat\MaralSAS.accdb"

# Lee .env del backend
def load_env():
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    env = {}
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    env[k.strip()] = v.strip().strip('"').strip("'")
    return env

# ── Keyword → interestTag mapping ──────────────────────────────
INTEREST_RULES = [
    ('DIPOL',   'DIPOLO'),
    ('VHF',     'VHF'),
    ('UHF',     'UHF'),
    ('CABLE',   'CABLE'),
    ('BASE',    'BASE'),
    ('RADIO',   'RADIO'),
    ('ANTENA',  'ANTENA'),
    ('YAGI',    'VHF'),
    ('HANDY',   'RADIO'),
    ('MOVIL',   'RADIO'),
    ('CONECTOR','CABLE'),
    ('COAXIAL', 'CABLE'),
]

def get_interest_tags(product_name: str) -> list:
    name_upper = (product_name or '').upper()
    tags = set()
    for keyword, tag in INTEREST_RULES:
        if keyword in name_upper:
            tags.add(tag)
    return list(tags)

# ── CXCClientes → CustomerSegment mapping ──────────────────────
# In Merlin, Tipo in CXCClientes reflects the client category
def infer_segment_from_category(merlin_categoria: int | None) -> str | None:
    """
    Merlin categories observed:
    1 = Cliente Final → CF
    2 = Distribuidor  → DS
    3 = Importador    → IM
    """
    mapping = {1: 'CF', 2: 'DS', 3: 'IM'}
    return mapping.get(merlin_categoria)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true', help='Show what would change without writing')
    args = parser.parse_args()

    env = load_env()
    db_url = env.get('DATABASE_URL', '')

    # Parse DATABASE_URL: postgresql://user:pass@host:port/dbname
    import re
    m = re.match(r'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)', db_url)
    if not m:
        print(f"ERROR: No se pudo parsear DATABASE_URL: {db_url}")
        sys.exit(1)
    pg_user, pg_pass, pg_host, pg_port, pg_db = m.groups()

    # ── Connect to Merlin ───────────────────────────────────────
    print("Conectando a Merlin...")
    try:
        merlin_conn = pyodbc.connect(
            f'DRIVER={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={MERLIN_DB};'
        )
        merlin_cur = merlin_conn.cursor()
        print("  OK")
    except Exception as e:
        print(f"ERROR Merlin: {e}")
        sys.exit(1)

    # ── Connect to PostgreSQL ───────────────────────────────────
    print("Conectando a PostgreSQL...")
    try:
        pg_conn = psycopg2.connect(
            host=pg_host, port=int(pg_port),
            user=pg_user, password=pg_pass, dbname=pg_db
        )
        pg_cur = pg_conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        print("  OK")
    except Exception as e:
        print(f"ERROR PostgreSQL: {e}")
        sys.exit(1)

    # ── Load all Merlin products ────────────────────────────────
    print("Cargando productos de Merlin...")
    merlin_cur.execute("SELECT Codigo, Nombre FROM INVElementos")
    products = {row[0]: row[1] for row in merlin_cur.fetchall()}
    print(f"  {len(products)} productos")

    # ── Load all Merlin clients with categories ─────────────────
    print("Cargando categorías de clientes Merlin (CXCClientes)...")
    try:
        merlin_cur.execute("SELECT Tercero, CategoriaPrecio FROM CXCClientes")
        cxc_data = {row[0]: row[1] for row in merlin_cur.fetchall()}
    except Exception as e:
        print(f"  WARNING: No se pudo leer CXCClientes: {e}")
        cxc_data = {}
    print(f"  {len(cxc_data)} clientes CXC")

    # ── Load SISTerceros for segment fallback from Categoria ────
    merlin_cur.execute("SELECT Codigo, Categoria FROM SISTerceros")
    sis_data = {row[0]: row[1] for row in merlin_cur.fetchall()}

    # ── Load ALL sales line items from INVMovimientosElementos ──
    # Tipo 1 = Factura, Tipo 4 = Remision/Pedido — both count as sales
    print("Leyendo movimientos de venta en Merlin...")
    merlin_cur.execute("""
        SELECT inv.Tipo, inv.Numero, inv.Elemento, inv.Cantidad, inv.Valor, inv.Fecha, ven.Tercero
        FROM INVMovimientosElementos AS inv
        INNER JOIN VENMovimientos AS ven
            ON inv.Tipo = ven.Tipo AND inv.Numero = ven.Numero AND inv.SubEmpresa = ven.SubEmpresa
        WHERE inv.Tipo IN (1, 4)
    """)
    all_movements = merlin_cur.fetchall()
    print(f"  {len(all_movements)} líneas de venta")

    # ── Aggregate per Tercero ───────────────────────────────────
    from collections import defaultdict
    client_data = defaultdict(lambda: {
        'interest_tags': set(),
        'lifetime_value': 0.0,
        'last_order_at': None,
        'segment': None,
    })

    for tipo, numero, elemento, cantidad, valor, fecha, tercero in all_movements:
        if not tercero or tercero == 0:
            continue
        product_name = products.get(elemento, '')
        tags = get_interest_tags(product_name)

        d = client_data[tercero]
        d['interest_tags'].update(tags)
        if valor:
            d['lifetime_value'] += float(valor)
        if fecha and (d['last_order_at'] is None or fecha > d['last_order_at']):
            d['last_order_at'] = fecha

    # Assign segment
    for tercero in client_data:
        cat = cxc_data.get(tercero) or sis_data.get(tercero)
        seg = infer_segment_from_category(cat)
        client_data[tercero]['segment'] = seg

    print(f"  Datos agregados para {len(client_data)} terceros de Merlin")

    # ── Load MARAL OS clients with merlinCode ───────────────────
    print("Cargando clientes de MARAL OS con merlinCode...")
    pg_cur.execute('SELECT id, "merlinCode", name, category FROM "Client" WHERE "merlinCode" IS NOT NULL')
    maral_clients = pg_cur.fetchall()
    print(f"  {len(maral_clients)} clientes con merlinCode")

    # ── Segment mapping from MARAL OS category (fallback) ───────
    category_to_segment = {
        'IMPORTADOR': 'IM',
        'DISTRIBUIDOR': 'DS',
        'CLIENTE_FINAL': 'CF',
    }

    # ── Update ──────────────────────────────────────────────────
    updated = 0
    no_data = 0
    print("\nProcesando clientes...")

    for row in maral_clients:
        client_id, merlin_code, name, category = row
        try:
            tercero_id = int(merlin_code)
        except (ValueError, TypeError):
            no_data += 1
            continue

        merlin_info = client_data.get(tercero_id)

        # Determine segment: Merlin > MARAL OS category
        segment = None
        if merlin_info and merlin_info['segment']:
            segment = merlin_info['segment']
        elif category in category_to_segment:
            segment = category_to_segment[category]

        if merlin_info:
            interest_tags = sorted(merlin_info['interest_tags']) if merlin_info['interest_tags'] else ['PROSPECTO']
            lifetime_value = merlin_info['lifetime_value'] if merlin_info['lifetime_value'] > 0 else None
            last_order_at = merlin_info['last_order_at']
        else:
            interest_tags = ['PROSPECTO']
            lifetime_value = None
            last_order_at = None
            no_data += 1

        if args.dry_run:
            print(f"  DRY-RUN: {name[:40]:40} | segment={segment:3} | tags={interest_tags} | ltv={lifetime_value} | last={last_order_at}")
        else:
            pg_cur.execute(
                """
                UPDATE "Client"
                SET
                    "interestTags" = %s,
                    "lifetimeValue" = %s,
                    "lastOrderAt" = %s,
                    segment = %s::"CustomerSegment",
                    "updatedAt" = NOW()
                WHERE id = %s
                """,
                (
                    interest_tags,
                    lifetime_value,
                    last_order_at,
                    segment,
                    client_id,
                )
            )
            updated += 1

    # ── Also update clients WITHOUT merlinCode from MARAL OS orders ──
    print("\nActualizando clientes sin merlinCode desde pedidos de MARAL OS...")
    pg_cur.execute("""
        SELECT c.id, c.name, c.category,
               STRING_AGG(DISTINCT p.name, '|') AS product_names,
               MAX(o."createdAt") AS last_order,
               SUM(o.total) AS total_value
        FROM "Client" c
        JOIN "Order" o ON o."clientId" = c.id
        JOIN "OrderItem" oi ON oi."orderId" = o.id
        JOIN "Product" p ON p.id = oi."productId"
        WHERE c."merlinCode" IS NULL
          AND o.status NOT IN ('CANCELADO')
        GROUP BY c.id, c.name, c.category
    """)
    maral_orders = pg_cur.fetchall()
    print(f"  {len(maral_orders)} clientes con pedidos en MARAL OS")

    for client_id, name, category, product_names_str, last_order, total_value in maral_orders:
        interest_tags = set()
        for pname in (product_names_str or '').split('|'):
            interest_tags.update(get_interest_tags(pname))
        if not interest_tags:
            interest_tags = {'PROSPECTO'}

        segment = category_to_segment.get(category)

        if not args.dry_run:
            pg_cur.execute(
                """
                UPDATE "Client"
                SET
                    "interestTags" = %s,
                    "lifetimeValue" = COALESCE("lifetimeValue", %s),
                    "lastOrderAt" = COALESCE("lastOrderAt", %s),
                    segment = COALESCE(segment, %s::"CustomerSegment"),
                    "updatedAt" = NOW()
                WHERE id = %s
                """,
                (
                    sorted(interest_tags),
                    total_value,
                    last_order,
                    segment,
                    client_id,
                )
            )
            updated += 1

    # ── Mark remaining clients as PROSPECTO ─────────────────────
    if not args.dry_run:
        pg_cur.execute("""
            UPDATE "Client"
            SET "interestTags" = ARRAY['PROSPECTO'],
                "updatedAt" = NOW()
            WHERE "interestTags" = '{}'
        """)
        pg_conn.commit()
        print(f"\nFinalizado. {updated} clientes actualizados. {no_data} sin historial (marcados PROSPECTO).")
    else:
        print(f"\nDRY-RUN: {updated} clientes se actualizarían. {no_data} sin historial.")

    merlin_conn.close()
    pg_conn.close()


if __name__ == '__main__':
    main()
