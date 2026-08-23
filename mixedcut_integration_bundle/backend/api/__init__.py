# -*- coding: utf-8 -*-
"""
API Module
API路由模块
"""

from .project_api import register_project_routes
from .task_api import register_task_routes
from .remix_api import register_remix_routes
from .upload_routes import register_upload_routes

__all__ = [
    'register_project_routes',
    'register_task_routes',
    'register_remix_routes',
    'register_upload_routes',
]