from flask import Flask, request, jsonify
from sqlalchemy import create_engine, Column, Integer, String, text
from sqlalchemy.orm import declarative_base, sessionmaker
from flask_cors import CORS
from dotenv import load_dotenv
import os
import re

# Load env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("USERS_DB")

engine = create_engine(f"mssql+pymssql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}")
Base = declarative_base()
Session = sessionmaker(bind=engine)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100))
    email = Column(String(100))

Base.metadata.create_all(engine)

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

@app.route("/users", methods=["POST"])
def create_user():
    session = Session()
    try:
        data = request.json
        
        # Validate email
        email = data.get("email", "").strip()
        if not validate_email(email):
            return jsonify({"error": "Invalid email format. Email must contain @ and domain (e.g., user@gmail.com)"}), 400
        
        custom_id = data.get("id")
        
        # If custom ID provided
        if custom_id:
            custom_id = int(custom_id)
            if custom_id <= 0:
                return jsonify({"error": "ID must be positive"}), 400
                
            existing_user = session.query(User).filter(User.id == custom_id).first()
            if existing_user:
                return jsonify({"error": "ID already exists"}), 409
            
            # Check duplicate email
            existing_email = session.query(User).filter(User.email == email).first()
            if existing_email:
                return jsonify({"error": "Email already exists"}), 409
            
            try:
                session.execute(text("SET IDENTITY_INSERT users ON"))
                user = User(id=custom_id, name=data["name"], email=email)
                session.add(user)
                session.commit()
                session.execute(text("SET IDENTITY_INSERT users OFF"))
                session.commit()
                return jsonify({"message": "User created with custom ID", "id": user.id}), 201
            except Exception as e:
                session.rollback()
                session.execute(text("SET IDENTITY_INSERT users OFF"))
                session.commit()
                raise e
        else:
            # Check duplicate email
            existing_email = session.query(User).filter(User.email == email).first()
            if existing_email:
                return jsonify({"error": "Email already exists"}), 409
                
            user = User(name=data["name"], email=email)
            session.add(user)
            session.commit()
            return jsonify({"message": "User created", "id": user.id}), 201
            
    except ValueError:
        return jsonify({"error": "Invalid data format"}), 400
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@app.route("/users", methods=["GET"])
def list_users():
    session = Session()
    try:
        search = request.args.get('search', '').strip()
        query = session.query(User)
        
        if search:
            query = query.filter(
                (User.name.like(f"%{search}%")) | 
                (User.email.like(f"%{search}%"))
            )
        
        users = query.all()
        return jsonify([{"id": u.id, "name": u.name, "email": u.email} for u in users])
    finally:
        session.close()

@app.route("/users/<int:id>", methods=["PUT"])
def update_user(id):
    session = Session()
    try:
        # Reject negative IDs
        if id < 0:
            return jsonify({"error": "Invalid user ID"}), 400
            
        data = request.json
        user = session.query(User).filter(User.id == id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Validate email if provided
        if "email" in data:
            email = data["email"].strip()
            if not validate_email(email):
                return jsonify({"error": "Invalid email format. Email must contain @ and domain (e.g., user@gmail.com)"}), 400
            
            # Check duplicate email (excluding current user)
            existing_email = session.query(User).filter(
                User.email == email,
                User.id != id
            ).first()
            if existing_email:
                return jsonify({"error": "Email already exists"}), 409
        
        new_id = data.get("id")
        
        if new_id and int(new_id) != id:
            new_id = int(new_id)
            if new_id <= 0:
                return jsonify({"error": "ID must be positive"}), 400
                
            existing_user = session.query(User).filter(User.id == new_id).first()
            if existing_user:
                return jsonify({"error": "New ID already exists"}), 409
            
            old_name = user.name
            old_email = user.email
            
            session.delete(user)
            session.commit()
            
            try:
                session.execute(text("SET IDENTITY_INSERT users ON"))
                
                new_user = User(
                    id=new_id,
                    name=data.get("name", old_name),
                    email=data.get("email", old_email)
                )
                session.add(new_user)
                session.commit()
                
                session.execute(text("SET IDENTITY_INSERT users OFF"))
                session.commit()
                
                return jsonify({
                    "message": "User updated with new ID",
                    "old_id": id,
                    "new_id": new_id
                }), 200
                
            except Exception as e:
                session.rollback()
                session.execute(text("SET IDENTITY_INSERT users OFF"))
                session.commit()
                raise e
        else:
            user.name = data.get("name", user.name)
            if "email" in data:
                user.email = data["email"].strip()
            session.commit()
            return jsonify({"message": "User updated"}), 200
            
    except ValueError:
        return jsonify({"error": "Invalid data format"}), 400
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@app.route("/users/<int:id>", methods=["DELETE"])
def delete_user(id):
    session = Session()
    try:
        user = session.query(User).filter(User.id == id).first()
        if not user:
            return jsonify({"error": "User not found"}), 404
        session.delete(user)
        session.commit()
        return jsonify({"message": "User deleted"}), 200
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("USERS_PORT", 5001)), debug=True)