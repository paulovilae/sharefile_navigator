#!/usr/bin/env python3
"""
Script to seed default SharePoint filter settings in the database.
This ensures the default settings are available when users first access the SharePoint explorer.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Setting

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///ocr.db')
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Default SharePoint settings as specified in the task
DEFAULT_SHAREPOINT_SETTINGS = [
    {
        'key': 'sharepoint_default_file_type',
        'value': 'pdf',
        'category': 'sharepoint_filters',
        'description': 'Default file type filter when opening SharePoint explorer'
    },
    {
        'key': 'sharepoint_default_status',
        'value': 'not_processed',
        'category': 'sharepoint_filters',
        'description': 'Default OCR status filter when opening SharePoint explorer'
    },
    {
        'key': 'sharepoint_default_sort_field',
        'value': 'name',
        'category': 'sharepoint_filters',
        'description': 'Default field to sort files by'
    },
    {
        'key': 'sharepoint_default_size_order',
        'value': 'asc',
        'category': 'sharepoint_filters',
        'description': 'Default sort order for file size'
    },
    {
        'key': 'sharepoint_default_created_order',
        'value': 'desc',
        'category': 'sharepoint_filters',
        'description': 'Default sort order for creation date'
    },
    {
        'key': 'sharepoint_default_modified_order',
        'value': 'desc',
        'category': 'sharepoint_filters',
        'description': 'Default sort order for modified date'
    },
    {
        'key': 'sharepoint_default_rows_per_page',
        'value': '100',
        'category': 'sharepoint_filters',
        'description': 'Default number of files to show per page'
    }
]

def seed_sharepoint_settings():
    """Seed default SharePoint settings into the database."""
    db = SessionLocal()
    try:
        print("🔧 Seeding SharePoint default settings...")
        
        settings_created = 0
        settings_updated = 0
        
        for setting_data in DEFAULT_SHAREPOINT_SETTINGS:
            # Check if setting already exists
            existing_setting = db.query(Setting).filter(
                Setting.key == setting_data['key'],
                Setting.category == setting_data['category']
            ).first()
            
            if existing_setting:
                # Update existing setting
                existing_setting.value = setting_data['value']
                existing_setting.description = setting_data['description']
                settings_updated += 1
                print(f"  ✅ Updated: {setting_data['key']} = {setting_data['value']}")
            else:
                # Create new setting
                new_setting = Setting(**setting_data)
                db.add(new_setting)
                settings_created += 1
                print(f"  ➕ Created: {setting_data['key']} = {setting_data['value']}")
        
        db.commit()
        
        print(f"\n✅ SharePoint settings seeding completed!")
        print(f"   📊 Created: {settings_created} settings")
        print(f"   🔄 Updated: {settings_updated} settings")
        print(f"   📋 Total: {len(DEFAULT_SHAREPOINT_SETTINGS)} settings processed")
        
        # Verify settings
        print("\n🔍 Verifying seeded settings:")
        for setting_data in DEFAULT_SHAREPOINT_SETTINGS:
            setting = db.query(Setting).filter(
                Setting.key == setting_data['key'],
                Setting.category == setting_data['category']
            ).first()
            if setting:
                print(f"  ✅ {setting.key}: {setting.value}")
            else:
                print(f"  ❌ {setting_data['key']}: NOT FOUND")
        
    except Exception as e:
        print(f"❌ Error seeding SharePoint settings: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 SharePoint Settings Seeder")
    print("=" * 50)
    seed_sharepoint_settings()
    print("\n🎉 Done!")