import sys
import os

# Setup do caminho (igual ao seu script anterior)
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import SessionLocal
from app.crud.user import crud_user
from app.core.security import hash_password # Importante: hashear a senha

def fix_admin_password():
    db = SessionLocal()
    try:
        user = crud_user.get_by_email(db, email="joao.g.almeida1@gmail.com")
        if not user:
            print("❌ Usuário não encontrado.")
            return

        # Atualizando a senha para algo simples sem aspas
        # O CRUD geralmente já faz o hash, mas se for update direto no objeto:
        new_password = "admin"

        # Dependendo da implementação do seu CRUD, o update pode ser assim:
        crud_user.update(db, db_obj=user, obj_in={"password": new_password})

        print(f"✅ Senha alterada com sucesso para: {new_password}")

    except Exception as e:
        print(f"❌ Erro: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_admin_password()