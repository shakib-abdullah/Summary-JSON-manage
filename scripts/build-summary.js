const fs = require("fs");
const path = require("path");

// আপনার ২টি JSON ফোল্ডারের পাথ (প্রয়োজনে আরও ফোল্ডার যোগ করতে পারবেন)


const SOURCE_DIRS = [
  path.join(__dirname, "..", "raw_data", "2025"),
  path.join(__dirname, "..", "raw_data", "2027"),
];


const OUTPUT_DIR = path.join(__dirname, "..", "output");
const SUMMARY_FILE = path.join(OUTPUT_DIR, "summary.json");
const ERROR_LOG_FILE = path.join(OUTPUT_DIR, "error_log.json");

function extractCardSummary(data, folderName, fileName) {
  const leadPi = Array.isArray(data.pi) && data.pi.length > 0 ? data.pi[0] : null;
  const coPiCount = Array.isArray(data.pi) && data.pi.length > 1 ? data.pi.length - 1 : 0;

  return {
    awd_id: data.awd_id ?? null,
    _source_folder: folderName,
    _source_file: fileName,
    awd_titl_txt: data.awd_titl_txt ?? "",
    pi_full_name: leadPi?.pi_full_name ?? "",
    pi_email_addr: leadPi?.pi_email_addr ?? "",
    pi_role: leadPi?.pi_role ?? "",
    co_pi_count: coPiCount,
    inst_name: data.inst?.inst_name ?? "",
    inst_country: data.inst?.inst_country_name ?? "",
    awd_amount: data.awd_amount ?? data.tot_intn_awd_amt ?? 0,
    awd_eff_date: data.awd_eff_date ?? "",
    awd_exp_date: data.awd_exp_date ?? "",
    dir_abbr: data.dir_abbr ?? "",
  };
}

function run() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const summaryList = [];
  const errors = [];
  const seenIds = new Set();
  const duplicateIds = [];
  let totalFilesFound = 0;

  for (const dirPath of SOURCE_DIRS) {
    if (!fs.existsSync(dirPath)) {
      console.error("ফোল্ডার পাওয়া যায়নি:", dirPath);
      continue;
    }

    const folderName = path.basename(dirPath);
    const files = fs
      .readdirSync(dirPath)
      .filter((f) => f.toLowerCase().endsWith(".json"))
      .sort();

    totalFilesFound += files.length;
    console.log(`${folderName} ফোল্ডারে ফাইল পাওয়া গেছে: ${files.length}`);

    for (const fileName of files) {
      const fullPath = path.join(dirPath, fileName);
      try {
        const rawText = fs.readFileSync(fullPath, "utf-8");
        const jsonData = JSON.parse(rawText);

        const uniqueKey = `${jsonData.awd_id ?? ""}__${folderName}__${fileName}`;
        if (jsonData.awd_id && seenIds.has(String(jsonData.awd_id))) {
          duplicateIds.push({
            awd_id: jsonData.awd_id,
            folderName,
            fileName,
          });
        }
        if (jsonData.awd_id) {
          seenIds.add(String(jsonData.awd_id));
        }

        summaryList.push(extractCardSummary(jsonData, folderName, fileName));
      } catch (err) {
        errors.push({
          folderName,
          fileName,
          error: err.message,
        });
      }
    }
  }

  fs.writeFileSync(SUMMARY_FILE, JSON.stringify(summaryList, null, 2), "utf-8");
  fs.writeFileSync(
    ERROR_LOG_FILE,
    JSON.stringify({ errors, duplicateIds }, null, 2),
    "utf-8"
  );

  console.log("\n=== Summary Build Report ===");
  console.log("২ ফোল্ডার মিলিয়ে মোট JSON ফাইল:", totalFilesFound);
  console.log("Summary-তে যুক্ত হয়েছে:", summaryList.length);
  console.log("ত্রুটিপূর্ণ ফাইল (Error):", errors.length);
  console.log("একই awd_id একাধিকবার পাওয়া গেছে:", duplicateIds.length);

  if (totalFilesFound === summaryList.length && errors.length === 0) {
    console.log("স্ট্যাটাস: ১০০% সফল! কোনো ডেটা মিস হয়নি।");
  } else {
    console.log("নোট: কোনো সমস্যা থাকলে output/error_log.json চেক করুন।");
  }
}

run();
