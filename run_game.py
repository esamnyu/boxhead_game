#!/usr/bin/env python3
import webbrowser
import os

# Get the absolute path to the index.html file
current_dir = os.path.dirname(os.path.abspath(__file__))
index_path = os.path.join(current_dir, 'index.html')
file_url = f'file://{index_path}'

print(f"Opening game at: {file_url}")
webbrowser.open(file_url)
print("\nNote: If you see CORS errors, you'll need to:")
print("1. Open Chrome with disabled security (for development only):")
print("   open -n -a 'Google Chrome' --args --disable-web-security --user-data-dir=/tmp/chrome_dev")
print("\n2. Or use Firefox which is more lenient with local files")
print("\n3. Or start Chrome with a local server flag:")
print("   open -a 'Google Chrome' index.html --args --allow-file-access-from-files")