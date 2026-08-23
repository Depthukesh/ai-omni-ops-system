import mimetypes
import os
from pathlib import Path
from typing import Any

import requests
from fastmcp import FastMCP


VIDEOAUTOCUT_BASE_URL = os.getenv("VIDEOAUTOCUT_BASE_URL", "http://127.0.0.1:5000").rstrip("/")
HTTP_HOST = os.getenv("JJYB_MCP_HTTP_HOST", "0.0.0.0")
HTTP_PORT = int(os.getenv("JJYB_MCP_HTTP_PORT", "5501"))

mcp = FastMCP("videoautocut-mcp")


def _request_json(method: str, path: str, **kwargs: Any) -> Any:
    response = requests.request(method, f"{VIDEOAUTOCUT_BASE_URL}{path}", timeout=120, **kwargs)
    response.raise_for_status()
    payload = response.json()
    if isinstance(payload, dict) and payload.get("code") not in (None, 0):
        raise RuntimeError(str(payload.get("msg") or "mixedcut request failed"))
    if isinstance(payload, dict) and "data" in payload:
        return payload["data"]
    return payload


def _coerce_video_path(local_file_path: str) -> Path:
    path = Path(str(local_file_path or "").strip())
    if not path:
        raise ValueError("local_file_path 不能为空。")
    try:
        resolved = path.expanduser().resolve()
    except OSError:
        resolved = path.expanduser().absolute()
    if not resolved.is_file():
        raise FileNotFoundError(f"找不到视频文件：{resolved}")
    content_type, _ = mimetypes.guess_type(str(resolved))
    if not content_type or not content_type.startswith("video/"):
        raise ValueError(f"当前只允许上传视频文件：{resolved.name}")
    return resolved


def _upload_video(local_file_path: str, scene: str = "remix") -> dict[str, Any]:
    resolved = _coerce_video_path(local_file_path)
    content_type = mimetypes.guess_type(str(resolved))[0] or "video/mp4"
    with resolved.open("rb") as fh:
        files = {"video": (resolved.name, fh, content_type)}
        response = requests.post(
            f"{VIDEOAUTOCUT_BASE_URL}/api/upload/video",
            data={"scene": scene},
            files=files,
            timeout=300,
        )
    response.raise_for_status()
    payload = response.json()
    if payload.get("code") not in (None, 0):
        raise RuntimeError(str(payload.get("msg") or "mixedcut upload failed"))
    data = payload.get("data") or {}
    data["local_file_path"] = str(resolved)
    return data


@mcp.tool(description="检查 mixedcut 主服务是否在线，并返回版本与时间戳。")
def get_service_health() -> dict[str, Any]:
    return _request_json("GET", "/api/health")


@mcp.tool(description="查看最近 mixedcut 项目列表，默认返回最近 20 条。")
def list_projects(limit: int = 20, project_type: str = "remix") -> dict[str, Any]:
    return _request_json(
        "GET",
        "/api/projects",
        params={"limit": max(1, min(limit, 100)), "type": project_type, "sort": "updated_at", "order": "desc"},
    )


@mcp.tool(description="把当前运行环境可访问的本地视频上传到 mixedcut，并返回上传后的素材路径。")
def upload_video_file(local_file_path: str, scene: str = "remix") -> dict[str, Any]:
    return _upload_video(local_file_path, scene=scene)


@mcp.tool(description="直接发起 mixedcut 混剪任务。可传现成 video_paths，也可传本地文件路径后先自动上传。")
def create_remix_task(
    name: str,
    target_duration_seconds: float,
    video_paths: list[str] | None = None,
    local_file_paths: list[str] | None = None,
    style: str = "dynamic",
    template: str = "vlog",
    transition_style: str = "auto",
    remix_mode: str = "general",
    quality: str = "1080p",
    vision_model: str = "custom_vision",
) -> dict[str, Any]:
    normalized_video_paths = [str(item).strip() for item in (video_paths or []) if str(item).strip()]
    for local_file_path in local_file_paths or []:
        upload = _upload_video(local_file_path, scene="remix")
        upload_path = str(upload.get("path") or "").strip()
        if not upload_path:
            raise RuntimeError(f"上传视频成功但未返回素材路径：{local_file_path}")
        normalized_video_paths.append(upload_path)
    if not normalized_video_paths:
        raise ValueError("至少需要提供 video_paths 或 local_file_paths。")
    return _request_json(
        "POST",
        "/api/remix/generate",
        json={
            "name": name,
            "video_paths": normalized_video_paths,
            "target_duration_seconds": float(target_duration_seconds),
            "style": style,
            "template": template,
            "transition_style": transition_style,
            "remix_mode": remix_mode,
            "quality": quality,
            "vision_model": vision_model,
        },
    )


@mcp.tool(description="查询 mixedcut 混剪任务当前进度与结果。")
def get_task_progress(task_id: str) -> dict[str, Any]:
    return _request_json("GET", f"/api/tasks/{task_id}")


if __name__ == "__main__":
    mcp.run(transport="streamable-http", host=HTTP_HOST, port=HTTP_PORT)
