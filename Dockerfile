# Use the smallest official Python runtime
FROM python:3.11.11-alpine

# Set environment variables for Python to optimize runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Set the working directory in the container
WORKDIR /app

# Copy only requirements.txt first (for caching)
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Add a dedicated user and group 'mst'
RUN addgroup -S mst && adduser -S mst -G mst

# Set ownership of the /app directory to the 'mst' user
RUN chown -R mst:mst /app

# Switch to the 'mst' user
USER mst

# Copy the entire application code into the container
COPY . .

# Expose port 5000 for the Flask application
EXPOSE 5000

# Run the Flask application with Gunicorn
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]