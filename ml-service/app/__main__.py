"""
@fileoverview: __main__.py
@module: ml-service/app/__main__

Input:
#   - (no external imports)

Output:
#   - (no exports)

Pos: ml-service/app/__main__.py
"""

import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
