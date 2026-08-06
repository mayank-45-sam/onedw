import sys
sys.path.insert(0, r'c:\Users\mayan\Downloads\frd\backend')
try:
    import main
    print("SUCCESS: All imports OK!")
except Exception as e:
    import traceback
    traceback.print_exc()
