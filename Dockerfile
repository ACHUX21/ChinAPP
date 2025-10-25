FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y curl sqlite3

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p data

EXPOSE 8000

RUN pip install gunicorn
CMD ["gunicorn", "app.main:app", "--bind", "0.0.0.0:8000", "--workers", "4"]