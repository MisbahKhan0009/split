"""Group-domain API surface.

The legacy core viewset remains the compatibility implementation while the
project is migrated toward explicit domain packages.
"""

from apps.core.api import GroupViewSet

__all__ = ["GroupViewSet"]
