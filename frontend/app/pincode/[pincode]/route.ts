import shard11 from "indiapins/data/pincodes/11.json";
import shard12 from "indiapins/data/pincodes/12.json";
import shard13 from "indiapins/data/pincodes/13.json";
import shard14 from "indiapins/data/pincodes/14.json";
import shard15 from "indiapins/data/pincodes/15.json";
import shard16 from "indiapins/data/pincodes/16.json";
import shard17 from "indiapins/data/pincodes/17.json";
import shard18 from "indiapins/data/pincodes/18.json";
import shard19 from "indiapins/data/pincodes/19.json";
import shard20 from "indiapins/data/pincodes/20.json";
import shard21 from "indiapins/data/pincodes/21.json";
import shard22 from "indiapins/data/pincodes/22.json";
import shard23 from "indiapins/data/pincodes/23.json";
import shard24 from "indiapins/data/pincodes/24.json";
import shard25 from "indiapins/data/pincodes/25.json";
import shard26 from "indiapins/data/pincodes/26.json";
import shard27 from "indiapins/data/pincodes/27.json";
import shard28 from "indiapins/data/pincodes/28.json";
import shard30 from "indiapins/data/pincodes/30.json";
import shard31 from "indiapins/data/pincodes/31.json";
import shard32 from "indiapins/data/pincodes/32.json";
import shard33 from "indiapins/data/pincodes/33.json";
import shard34 from "indiapins/data/pincodes/34.json";
import shard36 from "indiapins/data/pincodes/36.json";
import shard37 from "indiapins/data/pincodes/37.json";
import shard38 from "indiapins/data/pincodes/38.json";
import shard39 from "indiapins/data/pincodes/39.json";
import shard40 from "indiapins/data/pincodes/40.json";
import shard41 from "indiapins/data/pincodes/41.json";
import shard42 from "indiapins/data/pincodes/42.json";
import shard43 from "indiapins/data/pincodes/43.json";
import shard44 from "indiapins/data/pincodes/44.json";
import shard45 from "indiapins/data/pincodes/45.json";
import shard46 from "indiapins/data/pincodes/46.json";
import shard47 from "indiapins/data/pincodes/47.json";
import shard48 from "indiapins/data/pincodes/48.json";
import shard49 from "indiapins/data/pincodes/49.json";
import shard50 from "indiapins/data/pincodes/50.json";
import shard51 from "indiapins/data/pincodes/51.json";
import shard52 from "indiapins/data/pincodes/52.json";
import shard53 from "indiapins/data/pincodes/53.json";
import shard56 from "indiapins/data/pincodes/56.json";
import shard57 from "indiapins/data/pincodes/57.json";
import shard58 from "indiapins/data/pincodes/58.json";
import shard59 from "indiapins/data/pincodes/59.json";
import shard60 from "indiapins/data/pincodes/60.json";
import shard61 from "indiapins/data/pincodes/61.json";
import shard62 from "indiapins/data/pincodes/62.json";
import shard63 from "indiapins/data/pincodes/63.json";
import shard64 from "indiapins/data/pincodes/64.json";
import shard67 from "indiapins/data/pincodes/67.json";
import shard68 from "indiapins/data/pincodes/68.json";
import shard69 from "indiapins/data/pincodes/69.json";
import shard70 from "indiapins/data/pincodes/70.json";
import shard71 from "indiapins/data/pincodes/71.json";
import shard72 from "indiapins/data/pincodes/72.json";
import shard73 from "indiapins/data/pincodes/73.json";
import shard74 from "indiapins/data/pincodes/74.json";
import shard75 from "indiapins/data/pincodes/75.json";
import shard76 from "indiapins/data/pincodes/76.json";
import shard77 from "indiapins/data/pincodes/77.json";
import shard78 from "indiapins/data/pincodes/78.json";
import shard79 from "indiapins/data/pincodes/79.json";
import shard80 from "indiapins/data/pincodes/80.json";
import shard81 from "indiapins/data/pincodes/81.json";
import shard82 from "indiapins/data/pincodes/82.json";
import shard83 from "indiapins/data/pincodes/83.json";
import shard84 from "indiapins/data/pincodes/84.json";
import shard85 from "indiapins/data/pincodes/85.json";

const SHARDS: Record<string, (string | number)[][]> = { "11": shard11, "12": shard12, "13": shard13, "14": shard14, "15": shard15, "16": shard16, "17": shard17, "18": shard18, "19": shard19, "20": shard20, "21": shard21, "22": shard22, "23": shard23, "24": shard24, "25": shard25, "26": shard26, "27": shard27, "28": shard28, "30": shard30, "31": shard31, "32": shard32, "33": shard33, "34": shard34, "36": shard36, "37": shard37, "38": shard38, "39": shard39, "40": shard40, "41": shard41, "42": shard42, "43": shard43, "44": shard44, "45": shard45, "46": shard46, "47": shard47, "48": shard48, "49": shard49, "50": shard50, "51": shard51, "52": shard52, "53": shard53, "56": shard56, "57": shard57, "58": shard58, "59": shard59, "60": shard60, "61": shard61, "62": shard62, "63": shard63, "64": shard64, "67": shard67, "68": shard68, "69": shard69, "70": shard70, "71": shard71, "72": shard72, "73": shard73, "74": shard74, "75": shard75, "76": shard76, "77": shard77, "78": shard78, "79": shard79, "80": shard80, "81": shard81, "82": shard82, "83": shard83, "84": shard84, "85": shard85 };

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pincode: string }> }
) {
  const { pincode } = await params;
  if (!/^[1-9]\d{5}$/.test(pincode)) {
    return Response.json({ error: "Invalid pincode" }, { status: 400 });
  }

  const rows = SHARDS[pincode.slice(0, 2)] ?? [];
  const office = rows.find((row) => String(row[1]) === pincode);
  if (!office) {
    return Response.json({ error: "No results for this pincode" }, { status: 404 });
  }

  return Response.json({ city: office[4], state: office[5] });
}
