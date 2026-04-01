# 1. Use the official Python image
FROM python:3.9

# 2. Set the working directory inside the container
WORKDIR /code

# 3. Copy your requirements and install them
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# 4. Copy the rest of your app code (including your .pkl model!)
COPY . .

# 5. Start the FastAPI app on port 7860 (Hugging Face's default port)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
