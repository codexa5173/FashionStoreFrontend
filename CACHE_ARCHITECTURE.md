# Cache and pagination

## Public pages

Public GET requests use IndexedDB with a **5-minute TTL**. While the cached response is younger than 5 minutes, navigation/reload uses the cached data. Once the TTL expires, the next page load fetches fresh data and replaces the cached response.

Public pages intentionally have **no manual Refresh button**. This keeps the storefront simple while still ensuring data refreshes automatically after the cache expires.

## Pagination

- Products admin: server-side pagination, 20/page.
- Categories admin: server-side pagination, 20/page.
- Notifications admin: server-side pagination, 20/page.
- Public product catalog: server-side pagination, 12/page.
- Today's Offers: the same paginated public product catalog filtered by offers.
- Most Demanded: the same paginated public product catalog filtered by demanded products.
- Public category pages: server-side product pagination, 12/page.
- Public categories: server-side pagination, 20/page.
- Homepage offers/popular sections are intentionally limited previews (8 each); their “See all” links open the paginated public pages.
