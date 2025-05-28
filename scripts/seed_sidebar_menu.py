from app.models import SidebarMenu, SidebarMenuCategory, Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

# Adjust this if your DB URL is different
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///ocr.db')
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

# 1. Create categories (optional, for grouping)
cat_settings = SidebarMenuCategory(name="Settings", description="Settings and configuration")
cat_blocks = SidebarMenuCategory(name="Blocks", description="Block and workflow management")
db.add_all([cat_settings, cat_blocks])
db.commit()
db.refresh(cat_settings)
db.refresh(cat_blocks)

# 2. Create menu items (replace/add as needed)
menus = [
    SidebarMenu(label="Files", icon="Folder", page_ref="/files", category_id=None, order=1, enabled=True),
    SidebarMenu(label="Blocks", icon="Category", page_ref="/blocks", category_id=cat_blocks.id, order=2, enabled=True),
    SidebarMenu(label="Settings", icon="Settings", page_ref="/settings", category_id=cat_settings.id, order=3, enabled=True),
]

db.add_all(menus)
db.commit()
print("Sidebar menu seeded!") 