#!/usr/bin/env python3
"""
Script SIMPLES para criar conta de administrador inicial
Compatível com o modelo User do Rotina Inteligente

Uso: python create_admin.py
"""
import sys
import os
from pathlib import Path

# Tentar carregar .env
try:
    from dotenv import load_dotenv

    env_paths = [
        Path('.env'),
        Path('../.env'),
        Path('../../.env'),
        Path('backend/.env'),
    ]

    for env_path in env_paths:
        if env_path.exists():
            load_dotenv(env_path)
            print(f"✅ Arquivo .env carregado: {env_path.absolute()}")
            break
except ImportError:
    print("⚠️  python-dotenv não instalado.")

try:
    from sqlalchemy import create_engine, text
except ImportError:
    print("❌ SQLAlchemy não encontrado. Instale com:")
    print("   pip install sqlalchemy")
    sys.exit(1)

try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
except ImportError:
    print("❌ passlib não encontrado. Instale com:")
    print("   pip install passlib[bcrypt]")
    sys.exit(1)


# ========================================
# CONFIGURAÇÃO
# ========================================

DATABASE_URL = os.getenv("DATABASE_URL")

# Se não tiver DATABASE_URL, monta a partir das partes
if not DATABASE_URL:
    POSTGRES_USER = os.getenv("POSTGRES_USER", "rotina_user")
    POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "rotina_password")
    POSTGRES_DB = os.getenv("POSTGRES_DB", "rotina_inteligente_db")
    POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
    DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

# Dados do admin (pode vir do .env ou ser inserido manualmente)
ADMIN_NAME = os.getenv("ADMIN_NAME", "")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")


def verificar_tabela_existe(conn) -> bool:
    """Verifica se a tabela users existe"""
    result = conn.execute(text("""
                               SELECT EXISTS (
                                   SELECT FROM information_schema.tables
                                   WHERE table_name = 'users'
                               );
                               """))
    return result.fetchone()[0]


def get_enum_info(conn):
    """Detecta o enum de role usado na coluna"""
    # Primeiro pega o nome do tipo da coluna role
    result = conn.execute(text("""
                               SELECT udt_name
                               FROM information_schema.columns
                               WHERE table_name = 'users' AND column_name = 'role'
                               """))
    row = result.fetchone()
    if not row:
        return None, None

    enum_name = row[0]

    # Agora pega os valores desse enum
    result = conn.execute(text("""
                               SELECT e.enumlabel
                               FROM pg_type t
                                        JOIN pg_enum e ON t.oid = e.enumtypid
                               WHERE t.typname = :enum_name
                               ORDER BY e.enumsortorder
                               """), {"enum_name": enum_name})

    values = [r[0] for r in result.fetchall()]
    return enum_name, values


def usuario_existe(conn, email: str) -> bool:
    """Verifica se usuário já existe"""
    result = conn.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": email}
    )
    return result.fetchone() is not None


def criar_admin():
    print("\n" + "=" * 60)
    print("  🔐 ROTINA INTELIGENTE - CRIAR ADMIN")
    print("=" * 60)

    # Coletar dados
    print("\n👤 Dados do Administrador")
    print("-" * 40)

    email = input(f"Email [{ADMIN_EMAIL or 'admin@admin.com'}]: ").strip()
    email = email or ADMIN_EMAIL or "admin@admin.com"

    name = input(f"Nome [{ADMIN_NAME or 'Administrador'}]: ").strip()
    name = name or ADMIN_NAME or "Administrador"

    if ADMIN_PASSWORD:
        password = ADMIN_PASSWORD
    else:
        from getpass import getpass
        password = getpass("Senha: ")
        password_confirm = getpass("Confirmar senha: ")
        if password != password_confirm:
            print("\n❌ Senhas não conferem!")
            return False

    if len(password) < 4:
        print("\n❌ Senha muito curta! Mínimo 4 caracteres.")
        return False

    # Confirmar
    print(f"\n📋 Confirme os dados:")
    print(f"   📧 Email: {email}")
    print(f"   📝 Nome:  {name}")
    print(f"   🔑 Senha: {'*' * len(password)}")

    confirma = input("\n❓ Criar usuário? (s/N): ").strip().lower()
    if confirma != 's':
        print("❌ Cancelado.")
        return False

    # Conectar e criar
    print("\n🔄 Conectando ao banco de dados...")

    try:
        engine = create_engine(DATABASE_URL, future=True)

        with engine.connect() as conn:
            # Verificar tabela
            if not verificar_tabela_existe(conn):
                print("\n❌ Tabela 'users' não existe!")
                print("   Execute as migrations primeiro:")
                print("   alembic upgrade head")
                return False

            print("✅ Tabela 'users' encontrada!")

            # Verificar enum
            enum_name, enum_values = get_enum_info(conn)
            if not enum_values:
                print("\n❌ Não foi possível detectar o enum de role!")
                return False

            print(f"✅ Enum '{enum_name}' encontrado: {enum_values}")

            # Encontrar valor admin
            admin_role = None
            for val in enum_values:
                if 'admin' in val.lower():
                    admin_role = val
                    break

            if not admin_role:
                print(f"\n⚠️  Nenhum valor 'admin' encontrado.")
                admin_role = input(f"Qual valor usar? {enum_values}: ").strip()

            # Verificar se usuário existe
            if usuario_existe(conn, email):
                print(f"\n❌ Usuário '{email}' já existe!")
                return False

            # Hash da senha
            print("🔐 Gerando hash da senha...")
            senha_hash = pwd_context.hash(password)

            # Inserir - incluindo created_at e updated_at
            print("💾 Criando usuário...")

            query = text(f"""
                INSERT INTO users (
                    id, 
                    email, 
                    name, 
                    password_hash, 
                    role, 
                    is_active,
                    created_at,
                    updated_at
                )
                VALUES (
                    gen_random_uuid(),
                    :email,
                    :name,
                    :password_hash,
                    :role :: {enum_name},
                    true,
                    NOW(),
                    NOW()
                )
                RETURNING id, email, name, role, created_at
            """)

            result = conn.execute(query, {
                "email": email,
                "name": name,
                "password_hash": senha_hash,
                "role": admin_role
            })

            user = result.fetchone()

            print("\n" + "=" * 60)
            print("✅ USUÁRIO CRIADO COM SUCESSO!")
            print("=" * 60)
            print(f"   🆔 ID:    {user[0]}")
            print(f"   📧 Email: {user[1]}")
            print(f"   📝 Nome:  {user[2]}")
            print(f"   🎭 Role:  {user[3]}")
            print(f"   📅 Data:  {user[4]}")
            print("=" * 60)
            print("\n⚠️  Guarde a senha! Ela não pode ser recuperada.\n")

            return True

    except Exception as e:
        print(f"\n❌ ERRO: {e}")

        print("\n" + "=" * 60)
        print("💡 TROUBLESHOOTING")
        print("=" * 60)
        print("\n1️⃣ PostgreSQL está rodando?")
        print("   docker-compose ps")
        print("   docker-compose up -d postgres")

        print("\n2️⃣ Tabela 'users' existe?")
        print("   Execute: alembic upgrade head")

        print("\n3️⃣ Credenciais corretas?")
        print(f"   DATABASE_URL: {DATABASE_URL[:50]}...")

        import traceback
        traceback.print_exc()

        return False

    finally:
        if 'engine' in locals():
            engine.dispose()


if __name__ == "__main__":
    try:
        sucesso = criar_admin()
        sys.exit(0 if sucesso else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Cancelado pelo usuário.")
        sys.exit(1)