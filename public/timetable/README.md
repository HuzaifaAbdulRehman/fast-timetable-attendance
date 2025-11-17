# 📚 Timetable CSV Upload Guide

## 📁 File Structure

Place your FAST NUCES timetable CSV files in this directory with these exact names:

```
public/timetable/
├── FAST NUCES - Karachi Campus - FALL 2025 TimeTable (All BS Programs) - MONDAY.csv
├── FAST NUCES - Karachi Campus - FALL 2025 TimeTable (All BS Programs) - TUESDAY.csv
├── FAST NUCES - Karachi Campus - FALL 2025 TimeTable (All BS Programs) - WEDNESDAY.csv
├── FAST NUCES - Karachi Campus - FALL 2025 TimeTable (All BS Programs) - THURSDAY.csv
└── FAST NUCES - Karachi Campus - FALL 2025 TimeTable (All BS Programs) - FRIDAY.csv
```

## 🚀 How to Update Timetable

### Method 1: GitHub (Recommended - Auto-deploy)

1. Download all 5 CSV files from university portal
2. Replace the CSV files in `public/timetable/` directory
3. Commit and push to GitHub:
   ```bash
   git add public/timetable/*.csv
   git commit -m "Update timetable for Fall 2025"
   git push
   ```
4. GitHub Actions will automatically:
   - Parse all CSVs
   - Generate `timetable.json`
   - Deploy to Vercel
5. Students see updates on next app load!

### Method 2: Manual Upload (Local testing)

1. Place CSV files in `public/timetable/`
2. Run parser script:
   ```bash
   node scripts/parse-timetable.js
   ```
3. Check generated `public/timetable/timetable.json`
4. Test locally: `npm run dev`

## 📊 CSV Format Requirements

Your CSV files should follow FAST NUCES format:
- Row 1: Day name (MONDAY, TUESDAY, etc.)
- Row 2: Slot numbers (1-9)
- Row 3: Time slots
- Row 4: "CLASSROOMS" header
- Row 5+: Room data with format:
  ```
  Room Name, Slot1 Data, Slot2 Data, ...
  ```

Cell format:
```
COURSE_CODE SECTION
Instructor Name
```

Example:
```
DAA BCS-5B
Fahad Sherwani
```

## ✅ Verification

After uploading, verify:
1. All 5 CSV files are in `public/timetable/`
2. File names match exactly (case-sensitive)
3. CSV files open correctly in Excel/Notepad
4. No encoding issues (UTF-8)

## 🔄 Update Frequency

Update timetable when:
- New semester starts
- Room changes occur
- Instructor assignments change
- Schedule modifications happen

## 📱 Student Experience

After you update:
1. Students open app
2. Click "From Timetable" button
3. Search their section (e.g., "BCS-5F")
4. See all courses with rooms, instructors, times
5. Select and add to their tracker

## 🐛 Troubleshooting

**Problem**: Parser fails
- **Solution**: Check CSV format, ensure no extra columns/rows

**Problem**: Courses not showing
- **Solution**: Verify section names match (e.g., "BCS-5F" not "5F")

**Problem**: Wrong instructor/room
- **Solution**: Fix in original CSV and re-upload

## 📞 Support

For issues, check:
1. GitHub Actions logs (if using Method 1)
2. Generated `timetable.json` file
3. Browser console for errors
