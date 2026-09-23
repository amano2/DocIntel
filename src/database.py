from supabase import create_client, Client
from src.config import SUPABASE_URL, SUPABASE_ANON_KEY

# Global service-role client is NOT recommended for general use due to RLS bypass.
# We use request-scoped clients authenticated with the user's JWT.

def get_db_client(jwt_token: str = None) -> Client:
    """
    Returns a Supabase client.
    If jwt_token is provided, the client is authenticated as that user and respects RLS.
    If not provided, it falls back to the anon role (unauthenticated).
    """
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise ValueError("Supabase credentials not configured in environment")
        
    # We must instantiate a new client per request to avoid cross-request state pollution
    client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    if jwt_token:
        # Override the auth header for this specific client instance
        client.options.headers.update({"Authorization": f"Bearer {jwt_token}"})
        
    return client

# For the evaluation pipeline which runs out-of-band and needs to insert eval runs
def get_service_role_client() -> Client:
    # We fallback to anon key if service role isn't explicitly set, 
    # but in a real setup, eval pipeline should run with service role.
    import os
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_ANON_KEY)
    return create_client(SUPABASE_URL, service_key)
