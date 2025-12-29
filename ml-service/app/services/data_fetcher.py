"""Service for fetching historical lottery data from backend API."""

import httpx
from typing import List, Dict, Any, Optional
from ..core.config import settings


class DataFetchError(Exception):
    """Raised when data fetching fails."""
    pass


async def fetch_historical_data(count: int = 100) -> List[Dict[str, Any]]:
    """Fetch historical lottery data from backend API.

    Args:
        count: Number of recent draws to fetch

    Returns:
        List of historical lottery draws

    Raises:
        DataFetchError: If fetching fails
    """
    backend_url = settings.backend_api_url
    endpoint = f"{backend_url}/lottery/draws/latest"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(endpoint, params={"count": count})
            response.raise_for_status()

            data = response.json()

            # Handle different response formats
            if isinstance(data, dict):
                if 'data' in data:
                    return data['data']
                elif 'items' in data:
                    return data['items']
                else:
                    raise DataFetchError(f"Unexpected response format: {data}")
            elif isinstance(data, list):
                return data
            else:
                raise DataFetchError(f"Unexpected response type: {type(data)}")

    except httpx.HTTPStatusError as e:
        raise DataFetchError(f"HTTP error fetching data: {e.response.status_code}") from e
    except httpx.RequestError as e:
        raise DataFetchError(f"Request error fetching data: {str(e)}") from e
    except Exception as e:
        raise DataFetchError(f"Unexpected error fetching data: {str(e)}") from e


def fetch_historical_data_sync(count: int = 100) -> List[Dict[str, Any]]:
    """Synchronous version of fetch_historical_data.

    Args:
        count: Number of recent draws to fetch

    Returns:
        List of historical lottery draws

    Raises:
        DataFetchError: If fetching fails
    """
    backend_url = settings.backend_api_url
    endpoint = f"{backend_url}/lottery/draws/latest"

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(endpoint, params={"count": count})
            response.raise_for_status()

            data = response.json()

            # Handle different response formats
            if isinstance(data, dict):
                if 'data' in data:
                    return data['data']
                elif 'items' in data:
                    return data['items']
                else:
                    raise DataFetchError(f"Unexpected response format: {data}")
            elif isinstance(data, list):
                return data
            else:
                raise DataFetchError(f"Unexpected response type: {type(data)}")

    except httpx.HTTPStatusError as e:
        raise DataFetchError(f"HTTP error fetching data: {e.response.status_code}") from e
    except httpx.RequestError as e:
        raise DataFetchError(f"Request error fetching data: {str(e)}") from e
    except Exception as e:
        raise DataFetchError(f"Unexpected error fetching data: {str(e)}") from e
