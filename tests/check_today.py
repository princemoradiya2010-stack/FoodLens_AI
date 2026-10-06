from backend.database import get_today_summary

summary = get_today_summary()

print("\nTODAY SUMMARY:\n")
print(summary)