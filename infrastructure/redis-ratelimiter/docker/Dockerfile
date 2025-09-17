FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .
COPY healthcheck.py .
COPY test_ratelimit.py .

# Make scripts executable
RUN chmod +x healthcheck.py test_ratelimit.py

EXPOSE 8000

CMD ["python", "main.py"]
