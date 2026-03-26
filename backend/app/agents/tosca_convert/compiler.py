import asyncio
import tempfile
import os


async def compile_typescript(spec_content: str, file_name: str) -> tuple[bool, str]:
    """Run tsc --noEmit on the spec file. Returns (success, error_output)."""
    with tempfile.TemporaryDirectory() as tmpdir:
        spec_path = os.path.join(tmpdir, file_name)
        tsconfig_path = os.path.join(tmpdir, "tsconfig.json")

        with open(spec_path, "w", encoding="utf-8") as f:
            f.write(spec_content)

        tsconfig = """{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": false,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}"""
        with open(tsconfig_path, "w") as f:
            f.write(tsconfig)

        try:
            proc = await asyncio.create_subprocess_exec(
                "npx", "tsc", "--noEmit", "--project", tsconfig_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=tmpdir,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=60)
            error_output = (stdout + stderr).decode("utf-8", errors="replace")
            return proc.returncode == 0, error_output
        except (asyncio.TimeoutError, FileNotFoundError):
            return False, "tsc not available or timed out — skipping compilation check"
