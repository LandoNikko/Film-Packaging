@echo off
echo Updating JavaScript gallery data...
python generate_js_data.py
echo JavaScript gallery data updated!
echo.
echo The gallery should now show all 152 images without CORS issues.
pause 