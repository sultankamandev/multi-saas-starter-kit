FROM python:3.12-slim
WORKDIR /app
COPY backend/python-api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/python-api/ .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
