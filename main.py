from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
import pandas as pd
import mlflow.pyfunc
from fastapi.middleware.cors import CORSMiddleware

# Initialize the FastAPI application
app = FastAPI(
    title="NASA NEO Command Center API",
    description="Backend API for real-time asteroid tracking and hazard prediction.",
    version="1.0.0"
)

# Allow your web browser to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODEL LOADING ---
# Connect to your local MLflow database
mlflow.set_tracking_uri("sqlite:///mlflow.db")
RUN_ID = "f05167b6d0024eee9412b58e98d7e9fd" 

# Load the model globally so it only boots up once when the server starts
try:
    model = mlflow.pyfunc.load_model(f"runs:/{RUN_ID}/model")
    print("✅ Champion Model loaded successfully!")
except Exception as e:
    print(f"⚠️ Warning: Could not load MLflow model. Check your RUN_ID. Error: {e}")
    model = None

# --- DATA MODELS ---
# Pydantic models define the exact structure of the data your API expects to receive.
# This prevents users from sending bad data to your machine learning model.
class AsteroidTelemetry(BaseModel):
    absolute_magnitude_h: float
    estimated_diameter_max_km: float
    relative_velocity_kmh: float
    miss_distance_km: float

# --- API ENDPOINTS ---

@app.get("/")
def health_check():
    """Simple endpoint to verify the server is running."""
    return {"status": "online", "message": "NEO Command Center Backend is active."}

@app.get("/api/tracking")
def get_live_nasa_data():
    """Fetches real-time close approach data from NASA's JPL CAD API."""
    try:
        # Fetch asteroids passing within 0.05 AU (7.5 million km) today
        url = "https://ssd-api.jpl.nasa.gov/cad.api?dist-max=0.05&date-min=now"
        response = requests.get(url)
        response.raise_for_status() # Check for HTTP errors
        
        data = response.json()
        return {"count": data["count"], "asteroids": data["data"]}
        
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"NASA API connection failed: {e}")

@app.post("/api/predict")
def predict_hazard(telemetry: AsteroidTelemetry):
    """Takes asteroid telemetry from the frontend and returns the ML hazard prediction."""
    if model is None:
        raise HTTPException(status_code=503, detail="ML Model is not loaded on the server.")
    
    # Convert the incoming JSON data into a Pandas DataFrame format that XGBoost understands
    input_df = pd.DataFrame([{
        'absolute_magnitude_h': telemetry.absolute_magnitude_h,
        'estimated_diameter_max_km': telemetry.estimated_diameter_max_km,
        'relative_velocity_kmh': telemetry.relative_velocity_kmh,
        'miss_distance_km': telemetry.miss_distance_km
    }])
    
    # Run the prediction
    prediction = model.predict(input_df)
    
    # XGBoost returns a numpy array (e.g., [1] or [0]), so we extract the first element
    is_hazard = int(prediction[0])
    
    return {
        "is_hazardous": is_hazard,
        "status_text": "POTENTIALLY HAZARDOUS" if is_hazard == 1 else "SAFE"
    }