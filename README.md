# סטודיו א׳

ממשק אינטראקטיבי לסיבוב האות א׳ בתלת־ממד, זום, שינוי עומק והחלפה בין תשעה חומרים. כל הקוד, הטקסטורות והפונטים כלולים בתיקייה.

## העלאה ל־GitHub Pages

1. חלצו את קובץ ה־ZIP וצרו מאגר ב־GitHub.
2. העלו את כל הקבצים **מתוך** תיקיית `alef-material-studio` לשורש המאגר. ודאו ש־`index.html` ותיקיית `assets` מופיעים ישירות בשורש.
3. במאגר, פתחו **Settings → Pages**. תחת **Source** בחרו **Deploy from a branch**.
4. בחרו בענף `main` ובתיקייה `/(root)`, ולחצו **Save**. קישור האתר יופיע בהגדרות Pages אחרי הפרסום.

[הוראות GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## הפעלה מקומית

מתוך תיקיית הפרויקט הפעילו `python3 -m http.server 8000` ופתחו בדפדפן את `http://localhost:8000`. האתר סטטי ועולה ישירות מהקבצים. הרישיונות של Three.js ושל Heebo נמצאים בתיקיית `assets`.
