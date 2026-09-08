#!/usr/bin/env python3
import argparse
import json
import sys


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    sys.exit(1)


def normalize_text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        parts = [normalize_text(item) for item in value]
        return "\n".join([item for item in parts if item]).strip()
    if isinstance(value, dict):
        for key in ("text", "sentence_info", "sentences", "value"):
            if key in value:
                return normalize_text(value.get(key))
    return str(value).strip()


def run_paraformer(audio_path: str, model_name: str) -> dict:
    try:
        from funasr import AutoModel
    except Exception as exc:
        fail(
            "Paraformer runtime missing. Install dependencies first: "
            "pip install funasr modelscope. "
            f"Import error: {exc}"
        )

    model = AutoModel(
        model=model_name,
        vad_model="fsmn-vad",
        punc_model="ct-punc-c",
        trust_remote_code=True,
        disable_update=True,
    )
    result = model.generate(input=audio_path, batch_size_s=300)
    text = normalize_text(result)
    return {
        "text": text,
        "model": model_name,
    }


def run_whisper(audio_path: str, model_name: str, language: str, device: str, compute_type: str) -> dict:
    try:
        from faster_whisper import WhisperModel
    except Exception as exc:
        fail(
            "Whisper runtime missing. Install dependencies first: "
            "pip install faster-whisper. "
            f"Import error: {exc}"
        )

    model = WhisperModel(model_name, device=device, compute_type=compute_type)
    segments, _info = model.transcribe(
        audio_path,
        language=language or "zh",
        vad_filter=True,
        beam_size=5,
    )
    text_parts = []
    for segment in segments:
        segment_text = normalize_text(getattr(segment, "text", ""))
        if segment_text:
            text_parts.append(segment_text)
    return {
        "text": "\n".join(text_parts).strip(),
        "model": model_name,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--engine", required=True, choices=["paraformer", "whisper"])
    parser.add_argument("--audio", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--request-id", required=False, default="")
    parser.add_argument("--language", required=False, default="zh")
    parser.add_argument("--device", required=False, default="cpu")
    parser.add_argument("--compute-type", required=False, default="int8")
    args = parser.parse_args()

    if args.engine == "paraformer":
        payload = run_paraformer(args.audio, args.model)
    else:
        payload = run_whisper(args.audio, args.model, args.language, args.device, args.compute_type)

    payload["requestId"] = args.request_id
    print(json.dumps(payload, ensure_ascii=False))


if __name__ == "__main__":
    main()
