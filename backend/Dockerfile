FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Build the ML artifacts at image-build time so the trained parquet/TF-IDF
# files don't need to be committed to git — only the raw dataset CSV is.
RUN cd ml && python train.py

EXPOSE 8000

# Render (and most PaaS hosts) inject $PORT; fall back to 8000 for local runs.
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
