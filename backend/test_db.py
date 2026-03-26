from database import SessionLocal
import models
db = SessionLocal()
for u in db.query(models.User).all():
    print("User", u.id, u.name, u.email)
for p in db.query(models.Project).all():
    print("Project", p.id, p.name)
