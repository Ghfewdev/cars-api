require("dotenv").config();
var data = require('./data/Add.json');
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bodyParser = require('body-parser')
const jsonParser = bodyParser.json();
const xl = require('excel4node');

const { google } = require("googleapis");
const fs = require("fs");

const credentials = require("./data/g.json");

const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"], // สิทธิ์เข้าถึง Google Sheets
});

const app = express();
const conn2 = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_DATABASE
})
const bcrypt = require('bcrypt');
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const secect = 'abcdefg'

const FIXED_TOKEN = "hosonly";

const verifyToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1]; // ดึง token ออกจาก "Bearer <token>"

    if (token !== FIXED_TOKEN) {
        return res.status(403).json({ message: "Forbidden: Invalid token" });
    }

    next(); // ผ่านการตรวจสอบ ไปยัง route ถัดไป
};

function encode(text) {
    if (text.length <= 6) return text; // ถ้ายาวไม่ถึง 6 ตัวไม่ต้องเข้ารหัส
    const firstThree = text.slice(0, 3);
    const lastThree = text.slice(-3);
    const middleHidden = '*'.repeat(text.length - 6);
    return firstThree + middleHidden + lastThree;
}



function decode(originalText, encodedText) {
    return encodedText.includes('*') ? originalText : encodedText;
}

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("API")
})

app.get("/users2", jsonParser, (req, res) => {
    conn2.query("SELECT * FROM users", (err, t1) => {
        res.send(t1)
    })
})

app.post('/login2', jsonParser, (req, res, next) => {
    var qsql = "SELECT * FROM users WHERE us_name = ?"
    var qy = req.body.name
    conn2.execute(qsql, [qy], (err, users, fields) => {
        if (err) { res.json({ status: 'error', massage: err }); return }
        if (users.length === 0) { res.json({ status: 'error', massage: 'no user not found' }); return }
        bcrypt.compare(req.body.password, users[0].us_password, (err, islogin) => {
            if (islogin) {
                var token = jwt.sign({ name: users[0].us_name }, secect, { expiresIn: '1h' }) + "$" + users[0].us_level;
                res.json({ status: 'ok', massage: 'login success', token, name: users[0].us_name, id: users[0].us_id, dep: users[0].us_dep });
            } else {
                res.json({ status: 'erorr', massage: 'login failed' })
            }
        })
    })
})

app.put('/useredit2', jsonParser, (req, res, next) => {
    bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
        var Isql = "UPDATE users SET us_password = ?, us_name = ? WHERE us_id = ?;"
        var IV = [hash, req.body.name, req.body.id]
        conn2.execute(Isql, IV, (err, results, fields) => {
            if (err) {
                res.json({ status: 'error', massage: err })
                //return
            } else
                res.json({ status: 'ok' })

        })

    });

})

app.post('/authen2', jsonParser, (req, res, next) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, secect);
        res.json({ status: 'ok', name: decoded.name, decoded });
    } catch (err) {
        res.json({ status: 'error', massage: err.message })
    }

});

app.get("/hospital2", jsonParser, (req, res, next) => {
    conn2.query("SELECT * FROM hospital", (err, t1) => {
        res.send(t1)
    })
})

app.get("/preflix2", jsonParser, (req, res, next) => {
    conn2.query("SELECT * FROM preflix", (err, t1) => {
        res.send(t1)
    })
})

app.get("/district2", jsonParser, (req, res, next) => {
    conn2.query("SELECT * FROM district", (err, t1) => {
        res.send(t1)
    })
})

app.post('/fill2', jsonParser, (req, res, next) => {
    var Isql = "INSERT INTO `form` (`hos_id`, `way`, `date`, `citizen`, `pre_id`, `fname`, `lname`, `age`, `house`, `street`, `dis_id`, `district01`, `province`, `subdis`, `zipcode`, `call`, `dateres`, `met_id`, `start`, `end`, `condition`, `editer` ,`fm_time`, `fm_ac`, `ac_detail`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    var IV = [req.body.hos, req.body.way, req.body.date, req.body.sitizen, req.body.preflix, req.body.fname, req.body.lname, req.body.age, req.body.num, req.body.streed, req.body.district, req.body.disv1, req.body.province, req.body.subdistrict, req.body.zip, req.body.call, req.body.dateres, req.body.met, req.body.start, req.body.end, req.body.condition, req.body.editer, req.body.time, req.body.ac, req.body.acd]
    conn2.execute(Isql, IV, (err, results, fields) => {
        if (err) {
            res.json({ status: 'error', massage: err })
            //return
        } else
            res.json({ status: 'ok' })
    })
})

app.put('/edit/:id', jsonParser, (req, res, next) => {
    const id = req.params.id
    var Isql = "UPDATE `form` SET `date` = ?, `citizen` = ?, `fname` = ?, `lname` = ?, `age` = ?, `house` = ?, `street` = ?, `district01` = ?, `province` = ?, `subdis` = ?, `zipcode` = ?, `call` = ?, `dateres` = ?, `editer` = ? WHERE `fm_id` = ?"
    var IV = [req.body.date, req.body.sitizen, req.body.fname, req.body.lname, req.body.age, req.body.num, req.body.streed, req.body.disv1, req.body.province, req.body.subdistrict, req.body.zip, req.body.call, req.body.dateres, req.body.editer, id]
    conn2.execute(Isql, IV, (err, results, fields) => {
        if (err) {
            res.json({ status: 'error', massage: err })
            //return
        } else
            res.json({ status: 'ok' })
    })
})

// app.put('/edit/:id', jsonParser, (req, res, next) => {
//     const id = req.params.id
//     var Isql = "UPDATE `form` SET `date` = ?, `citizen` = ?, `pre_id` = ?, `fname` = ?, `lname` = ?, `age` = ?, `house` = ?, `street` = ?, `district01` = ?, `province` = ?, `subdis` = ?, `zipcode` = ?, `call` = ?, `dateres` = ?, `met_id` = ?, `start` = ?, `end` = ?, `condition` = ?, `editer` = ? WHERE `fm_id` = ?"
//     var IV = [req.body.date, req.body.sitizen, req.body.preflix, req.body.fname, req.body.lname, req.body.age, req.body.num, req.body.streed, req.body.disv1, req.body.province, req.body.subdistrict, req.body.zip, req.body.call, req.body.dateres, req.body.met, req.body.start, req.body.end, req.body.condition, req.body.editer, id]
//     conn2.execute(Isql, IV, (err, results, fields) => {
//         if (err) {
//             res.json({ status: 'error', massage: err })
//             //return
//         } else
//             res.json({ status: 'ok' })
//     })
// })



app.get("/form2", jsonParser, (req, res, next) => {
    conn2.query("SELECT * FROM formcom WHERE fm_ac = 1 ORDER BY status ASC, dateres ASC", (err, t1) => {
        t1 = t1.map(d => {
            if (d.date != null)
                d.date = "วันที่ " + formatDate(d.date.toISOString().split('T')[0]) + " เวลา " + (d.date.toISOString().split('T')[1]).split(".")[0] + " น.";
            if (d.dateres != null)
                d.dateres = " วันที่ " + formatDate(d.dateres.toISOString().split('T')[0]) + " เวลา " + (d.dateres.toISOString().split('T')[1]).split(".")[0] + " น.";
            return d;
        })
        res.send(t1)
    })
})

app.get("/form2a", jsonParser, (req, res, next) => {
    conn2.query("SELECT * FROM formcom ORDER BY status ASC, dateres ASC", (err, t1) => {
        t1 = t1.map(d => {
            if (d.date != null)
                d.date = "วันที่ " + formatDate(d.date.toISOString().split('T')[0]) + " เวลา " + (d.date.toISOString().split('T')[1]).split(".")[0] + " น.";
            if (d.dateres != null)
                d.dateres = " วันที่ " + formatDate(d.dateres.toISOString().split('T')[0]) + " เวลา " + (d.dateres.toISOString().split('T')[1]).split(".")[0] + " น.";
            return d;
        })
        res.send(t1)
    })
})

app.get("/formq/:date1/:date2", jsonParser, (req, res, next) => {
    const date1 = req.params.date1
    const date2 = req.params.date2
    conn2.query("SELECT * FROM formcom WHERE DATE_FORMAT(cm_date,'%Y-%m-%d') BETWEEN ? AND ? ORDER BY status ASC, dateres ASC", [date1, date2], (err, t1) => {
        t1 = t1.map(d => {
            if (d.date != null)
                d.date = "วันที่ " + formatDate(d.date.toISOString().split('T')[0]) + " เวลา " + (d.date.toISOString().split('T')[1]).split(".")[0] + " น.";
            if (d.dateres != null)
                d.dateres = " วันที่ " + formatDate(d.dateres.toISOString().split('T')[0]) + " เวลา " + (d.dateres.toISOString().split('T')[1]).split(".")[0] + " น.";
            return d;
        })
        // console.log(date1, date2)
        res.send(t1)

    })
})

app.get("/formcci/:id/:date1/:date2", jsonParser, (req, res, next) => {
    const id = req.params.id
    const date1 = req.params.date1
    const date2 = req.params.date2
    var sql = "SELECT * FROM formcom WHERE `status` = 1 AND hos_id = ? AND DATE(dateres) BETWEEN ? AND ?"
    var data = [id, date1, date2]
    if (id === "14") {
        sql = "SELECT * FROM formcom WHERE `status` = 1 AND DATE(dateres) BETWEEN ? AND ?"
        data = [date1, date2]
    }
    conn2.query(sql, data, (err, t1) => {
        t1 = t1.map(d => {
            if (d.date != null)
                d.date = "วันที่ " + formatDate(d.date.toISOString().split('T')[0]) + " เวลา " + (d.date.toISOString().split('T')[1]).split(".")[0] + " น.";
            if (d.dateres != null)
                d.dateres = " วันที่ " + formatDate(d.dateres.toISOString().split('T')[0]) + " เวลา " + (d.dateres.toISOString().split('T')[1]).split(".")[0] + " น.";
            return d;
        })
        // console.log(date1, date2)
        res.send(t1)

    })
})

app.get("/formccall/:date1/:date2", jsonParser, (req, res, next) => {

    const date1 = req.params.date1
    const date2 = req.params.date2
    const sql = "SELECT hos_name , COUNT(DISTINCT fm_id) as alls, COUNT(DISTINCT citizen) as complete FROM formcom WHERE status = 1 AND DATE(dateres) BETWEEN ? AND ? group by hos_id"

    conn2.query(sql, [date1, date2], (err, t1) => {

        res.send(t1)
    })
})

app.get("/formcc/:id/:date1/:date2", (req, res) => {
    const id = req.params.id
    const date1 = req.params.date1
    const date2 = req.params.date2
    var sql = "SELECT * FROM formcom WHERE `status` = 1 AND hos_id = ? AND DATE(dateres) BETWEEN ? AND ?"
    var data = [id, date1, date2]
    if (id === "14") {
        sql = "SELECT * FROM formcom WHERE `status` = 1 AND DATE(dateres) BETWEEN ? AND ?"
        data = [date1, date2]
    }
    conn2.query(sql, data, (err, t1) => {

        if (err) {
            res.json({ status: "erorr", massage: err });
        }
        else {

            var wb = new xl.Workbook();
            var ws = wb.addWorksheet('Sheet 1');

            ws.cell(1, 1).string("ลำดับที่");
            ws.cell(1, 2).string("โรงพยาบาล");
            ws.cell(1, 3).string("ช่องทางเข้ารับบริการ");
            ws.cell(1, 4).string("วันที่จอง");
            ws.cell(1, 5).string("เวลาที่จอง");
            ws.cell(1, 6).string("เลขบัตรประชาชน");
            ws.cell(1, 7).string("คำนำหน้าชื่อ");
            ws.cell(1, 8).string("ชื่อ");
            ws.cell(1, 9).string("นามสกุล");
            ws.cell(1, 10).string("อายุ(ปี)");
            ws.cell(1, 11).string("ผู้สูงอายุ");
            ws.cell(1, 12).string("คนพิการ");
            ws.cell(1, 13).string("ผู้มีความยากลำบากเข้าถึงบริการ");
            ws.cell(1, 14).string("การเห็น");  // shifted to account for the new column
            ws.cell(1, 15).string("การได้ยินหรือสื่อความหมาย");
            ws.cell(1, 16).string("การเคลื่อนไหวหรือทางร่างกาย");
            ws.cell(1, 17).string("จิตใจหรือพฤติกรรม");
            ws.cell(1, 18).string("สติปัญญา");
            ws.cell(1, 19).string("การเรียนรู้");
            ws.cell(1, 20).string("ออทิสติก");
            ws.cell(1, 21).string("ADL 5-12");
            ws.cell(1, 22).string("มีปัญหาด้านการเคลื่อนไหว");
            ws.cell(1, 23).string("มีนัดรักษาต่อเนื่องกับโรงพยาบาล");
            ws.cell(1, 24).string("มีปัญหาด้านเศรษฐานะ");
            ws.cell(1, 25).string("อื่น ๆ ระบุ");
            ws.cell(1, 26).string("เงื่อนไขระบุ");
            ws.cell(1, 27).string("ไม่เข้าเงื่อนไขระบุ");
            ws.cell(1, 28).string("บ้านเลขที่");
            ws.cell(1, 29).string("ถนน");
            ws.cell(1, 30).string("แขวง");
            ws.cell(1, 31).string("เขต");
            ws.cell(1, 32).string("จังหวัด");
            ws.cell(1, 33).string("รหัสไปรษณี");
            ws.cell(1, 34).string("เบอร์โทรศัพท์");
            ws.cell(1, 35).string("วันที่ขอรถ");
            ws.cell(1, 36).string("เวลาที่ขอรถ");
            ws.cell(1, 37).string("วิธีการ");
            ws.cell(1, 38).string("สถานที่ต้นทาง");
            ws.cell(1, 39).string("เลขที่ต้นทาง");
            ws.cell(1, 40).string("ถนนต้นทาง");
            ws.cell(1, 41).string("แขวงต้นทาง");
            ws.cell(1, 42).string("เขตต้นทาง");
            ws.cell(1, 43).string("จังหวัดต้นทาง");
            ws.cell(1, 44).string("รหัสไปรษณีต้นทาง");
            ws.cell(1, 45).string("สถานที่ปลายทาง");
            ws.cell(1, 46).string("เลขที่ปลายทาง");
            ws.cell(1, 47).string("ถนนปลายทาง");
            ws.cell(1, 48).string("แขวงปลายทาง");
            ws.cell(1, 49).string("เขตปลายทาง");
            ws.cell(1, 50).string("จังหวัดปลายทาง");
            ws.cell(1, 51).string("รหัสไปรษณีปลายทาง");
            ws.cell(1, 52).string("วันส่งข้อมูล");
            ws.cell(1, 53).string("เวลาส่งข้อมูล");
            ws.cell(1, 54).string("ชื่อผู้บันทึก");
            ws.cell(1, 55).string("สรุปผลการให้บริการ");
            ws.cell(1, 56).string("ระยะทาง(กม.)");
            ws.cell(1, 57).string("เวลาไป");
            ws.cell(1, 58).string("เวลากลับ");
            ws.cell(1, 59).string("สถานะ");
            ws.cell(1, 60).string("หมายเหตุยกเลิก");
            ws.cell(1, 61).string("ยกเลิกระบุ");
            ws.cell(1, 62).string("ทะเบียนรถ");
            ws.cell(1, 63).string("ประเภทรถ");
            ws.cell(1, 64).string("ประเภทรถอื่นๆ");
            ws.cell(1, 65).string("วันที่บริการสำเร็จ");
            ws.cell(1, 66).string("เวลาบริการสำเร็จ");
            // ws.cell(1, 53).string("สถานะขอรถ");

            t1.map((t, i) => {

                var start
                var end
                var condition
                var condn = "-"
                var dispass = "-"
                var time
                var date
                var deca = "-"
                var des


                if (t.start.split(" "))
                    start = t.start.split(" ")
                else
                    start = t.start

                if (t.end.split(" "))
                    end = t.end.split(" ")
                else
                    end = t.end

                if (t.condition.split(", ")) {
                    condition = t.condition.split(", ")
                    for (var j = 0; j <= 14; j++) {
                        if (condition[j] === "-" || condition[j] === undefined)
                            condition[j] = 0
                        else {
                            if (j === 5) {
                                condn = condition[j]
                            }
                            condition[j] = 1
                        }
                    }
                }
                else {
                    condition = t.condition
                }


                if (t.fm_time === null) {
                    date = null
                    time = null
                }
                else {
                    date = `${t.fm_time.getDate()}/${t.fm_time.getMonth() + 1}/${t.fm_time.getFullYear() + 543}`
                    time = `${t.fm_time.getHours()}:${t.fm_time.getMinutes()}:${t.fm_time.getSeconds()}`
                }

                if (t.cm_date === null) {
                    cmd = null
                    cmt = null
                }
                else {
                    cmd = `${t.cm_date.getDate()}/${t.cm_date.getMonth() + 1}/${t.cm_date.getFullYear() + 543}`
                    cmt = `${t.cm_date.getHours()}:${t.cm_date.getMinutes()}:${t.cm_date.getSeconds()}`
                }

                if (t.distance === null) {
                    t.distance = 0
                }
                // if (t.met_name === "-") {
                //     t.met_name = "ไม่เข้าเงื่อนไขการขอใช้รถ"
                // }
                if (t.status === null) {
                    t.status = "รอดำเนินการ"
                    if (t.ac_detail !== "เข้าเงื่อนไขการขอใช้รถ") {
                        t.status = "แนะนำบริการอื่น"
                    }
                }
                if (t.status === 1) {
                    t.status = "ดำเนินการสำเร็จ"
                }
                if (t.status === 0) {
                    t.status = "ยกเลิก"
                }
                if (t.des === null) {
                    des = ""
                } else if (t.des === "ยกเลิกนัด รถไม่พร้อม") {
                    des = "รถไม่พร้อม"
                } else if (t.des === "ยกเลิกนัด รถไม่เพียงพอ") {
                    des = "รถไม่เพียงพอ"
                } else if (t.des === "ผู้ป่วยยกเลิกนัด") {
                    des = "ผู้ป่วยยกเลิกนัด"
                } else if (t.des === "") {
                    des = ""
                }
                else {
                    deca = t.des
                    des = "อื่นๆ"
                }
                if (t.ac_detail === "แนะนำทำ Telemedicine" || t.ac_detail === "ส่งต่อเยี่ยมบ้านโดยโรงพยาบาล" || t.ac_detail === "ส่งต่อเยี่ยมบ้านโดยศูนย์บริการสาธารณสุข" || t.ac_detail === "เข้าเงื่อนไขการขอใช้รถ") {
                    t.ac_detail = t.ac_detail
                } else {
                    dispass = t.ac_detail
                    t.ac_detail = "อื่นๆ"
                }


                ws.cell(i + 2, 1).number(t.fm_id);
                ws.cell(i + 2, 2).string(t.hos_name);
                ws.cell(i + 2, 3).string(t.way);
                ws.cell(i + 2, 4).string(`${t.date.getDate()}/${t.date.getMonth() + 1}/${t.date.getFullYear() + 543}`);
                ws.cell(i + 2, 5).string(`${t.date.getHours()}:${t.date.getMinutes()}:${t.date.getSeconds()}`);
                ws.cell(i + 2, 6).string(t.citizen);
                ws.cell(i + 2, 7).string(t.pre_name);
                ws.cell(i + 2, 8).string(t.fname);
                ws.cell(i + 2, 9).string(t.lname);
                ws.cell(i + 2, 10).number(t.age);
                ws.cell(i + 2, 11).number(condition[0]);
                ws.cell(i + 2, 12).number(condition[6]);
                ws.cell(i + 2, 13).number(condition[14]);
                ws.cell(i + 2, 14).number(condition[7]);
                ws.cell(i + 2, 15).number(condition[8]);
                ws.cell(i + 2, 16).number(condition[9]);
                ws.cell(i + 2, 17).number(condition[10]);
                ws.cell(i + 2, 18).number(condition[11]);
                ws.cell(i + 2, 19).number(condition[12]);
                ws.cell(i + 2, 20).number(condition[13]);
                ws.cell(i + 2, 21).number(condition[1]);
                ws.cell(i + 2, 22).number(condition[2]);
                ws.cell(i + 2, 23).number(condition[3]);
                ws.cell(i + 2, 24).number(condition[4]);
                ws.cell(i + 2, 25).number(condition[5]);
                ws.cell(i + 2, 26).string(condn);
                ws.cell(i + 2, 27).string(dispass);
                ws.cell(i + 2, 28).string(t.house);
                ws.cell(i + 2, 29).string(t.street);
                ws.cell(i + 2, 30).string(t.subdis);
                ws.cell(i + 2, 31).string(t.district01);
                ws.cell(i + 2, 32).string(t.province);
                ws.cell(i + 2, 33).string(t.zipcode);
                ws.cell(i + 2, 34).string(t.call);
                ws.cell(i + 2, 35).string(`${t.dateres.getDate()}/${t.dateres.getMonth() + 1}/${t.dateres.getFullYear() + 543}`);
                ws.cell(i + 2, 36).string(`${t.dateres.getHours()}:${t.dateres.getMinutes()}:${t.dateres.getSeconds()}`);
                ws.cell(i + 2, 37).string(t.met_name);
                ws.cell(i + 2, 38).string(start[0]);
                ws.cell(i + 2, 39).string(start[1]);
                ws.cell(i + 2, 40).string(start[2]);
                ws.cell(i + 2, 41).string(start[3]);
                ws.cell(i + 2, 42).string(start[4]);
                ws.cell(i + 2, 43).string(start[5]);
                ws.cell(i + 2, 44).string(start[6]);
                ws.cell(i + 2, 45).string(end[0]);
                ws.cell(i + 2, 46).string(end[1]);
                ws.cell(i + 2, 47).string(end[2]);
                ws.cell(i + 2, 48).string(end[3]);
                ws.cell(i + 2, 49).string(end[4]);
                ws.cell(i + 2, 50).string(end[5]);
                ws.cell(i + 2, 51).string(end[6]);
                ws.cell(i + 2, 52).string(date);
                ws.cell(i + 2, 53).string(time);
                ws.cell(i + 2, 54).string(t.editer);
                ws.cell(i + 2, 55).string(t.ac_detail);
                ws.cell(i + 2, 56).number(t.distance);
                ws.cell(i + 2, 57).string(t.c_start);
                ws.cell(i + 2, 58).string(t.c_end);
                ws.cell(i + 2, 59).string(String(t.status));
                ws.cell(i + 2, 60).string(des);
                ws.cell(i + 2, 61).string(deca);
                ws.cell(i + 2, 62).string(t.car_name);
                ws.cell(i + 2, 63).string(t.car_type);
                ws.cell(i + 2, 64).string(t.car_other);
                ws.cell(i + 2, 65).string(cmd);
                ws.cell(i + 2, 66).string(cmt);
                // ws.cell(i + 2, 53).number(t.fm_ac);
            }
            )
            wb.write('ExcelFile.xlsx', res);
        }
    }
    )

})

app.get("/form2/users/:us", jsonParser, (req, res, next) => {
    const us = req.params.us
    conn2.query("SELECT * FROM formcom WHERE hos_id = ? AND fm_ac = 1 ORDER BY status ASC, dateres ASC", [us], (err, t1) => {
        t1 = t1.map(d => {
            // d.citizen = encode(d.citizen)
            // d.house = encode(d.house)
            // d.fname = encode(d.fname)
            // d.lname = encode(d.lname)
            if (d.date != null)
                d.date = "วันที่ " + formatDate(d.date.toISOString().split('T')[0]) + " เวลา " + (d.date.toISOString().split('T')[1]).split(".")[0] + " น.";
            if (d.dateres != null)
                d.dateres = " วันที่ " + formatDate(d.dateres.toISOString().split('T')[0]) + " เวลา " + (d.dateres.toISOString().split('T')[1]).split(".")[0] + " น.";
            return d;
        })
        res.send(t1)
    })
})


app.get("/form2/users2/:us", jsonParser, verifyToken, (req, res, next) => {
    const us = req.params.us
    conn2.query("SELECT * FROM formcom WHERE hos_id = ? AND fm_ac = 1 ORDER BY status ASC, dateres ASC", [us], (err, t1) => {
        t1 = t1.map(d => {
            // d.citizen = encode(d.citizen)
            // d.house = encode(d.house)
            // d.fname = encode(d.fname)
            // d.lname = encode(d.lname)
            if (d.date != null)
                d.date = "วันที่ " + formatDate(d.date.toISOString().split('T')[0]) + " เวลา " + (d.date.toISOString().split('T')[1]).split(".")[0] + " น.";
            if (d.dateres != null)
                d.dateres = " วันที่ " + formatDate(d.dateres.toISOString().split('T')[0]) + " เวลา " + (d.dateres.toISOString().split('T')[1]).split(".")[0] + " น.";
            return d;
        })
        res.send(t1)
    })
})

app.get("/form2/useall2", jsonParser, verifyToken, (req, res, next) => {
    conn2.query("SELECT * FROM formcom WHERE fm_ac = 1 ORDER BY status ASC, dateres ASC", (err, t1) => {
        t1 = t1.map(d => {

            var condition
            var condn = "-"
            var dispass = "-"
            var time
            var date
            var cmd
            var cmt
            var deca = "-"
            var des

            // const [
            //     elderly, disabilities, difficulty, vision, communication, 
            //     physical, mental, intellectual, learning, autism, 
            //     adl, mobility, scheduled, financial, others
            // ] = d.condition.split(', ').map(s => s.trim());
            // // d.citizen = encode(d.citizen)
            // const conditions = {
            //     elderly, disabilities, difficulty, vision, communication, 
            //     physical, mental, intellectual, learning, autism, 
            //     adl, mobility, scheduled, financial, others
            // }

            // Object.keys(conditions).forEach(key => {
            //     conditions[key] = conditions[key] === "-" ? 0 : 1;
            // });

            // d.condition = conditions

            // if (d.date != null)
            //     d.date = "วันที่ " + formatDate(d.date.toISOString().split('T')[0]) + " เวลา " + (d.date.toISOString().split('T')[1]).split(".")[0] + " น.";
            // if (d.dateres != null)
            //     d.dateres = " วันที่ " + formatDate(d.dateres.toISOString().split('T')[0]) + " เวลา " + (d.dateres.toISOString().split('T')[1]).split(".")[0] + " น.";
            // if (d.fm_time != null)
            //     d.fm_time = " วันที่ " + formatDate(d.fm_time.toISOString().split('T')[0]) + " เวลา " + (d.fm_time.toISOString().split('T')[1]).split(".")[0] + " น.";

            if (d.condition.split(", ")) {
                condition = d.condition.split(", ")
                for (var j = 0; j <= 14; j++) {
                    if (condition[j] === "-" || condition[j] === undefined)
                        condition[j] = 0
                    else {
                        if (j === 5) {
                            condn = condition[j]
                        }
                        condition[j] = 1
                    }
                }
            }
            else {
                condition = d.condition
            }

            if (d.fm_time === null) {
                date = null
                time = null
            }
            else {
                date = `${d.fm_time.getDate()}/${d.fm_time.getMonth() + 1}/${d.fm_time.getFullYear() + 543}`
                time = `${d.fm_time.getHours()}:${d.fm_time.getMinutes()}:${d.fm_time.getSeconds()}`
            }

            if (d.cm_date === null) {
                cmd = null
                cmt = null
            }
            else {
                cmd = `${d.cm_date.getDate()}/${d.cm_date.getMonth() + 1}/${d.cm_date.getFullYear() + 543}`
                cmt = `${d.cm_date.getHours()}:${d.cm_date.getMinutes()}:${d.cm_date.getSeconds()}`
            }

            if (d.distance === null) {
                d.distance = 0
            }
            // if (t.met_name === "-") {
            //     t.met_name = "ไม่เข้าเงื่อนไขการขอใช้รถ"
            // }
            if (d.status === null) {
                d.status = "รอดำเนินการ"
                if (d.ac_detail !== "เข้าเงื่อนไขการขอใช้รถ") {
                    d.status = "แนะนำบริการอื่น"
                }
            }
            if (d.status === 1) {
                d.status = "ดำเนินการสำเร็จ"
            }
            if (d.status === 0) {
                d.status = "ยกเลิก"
            }
            if (d.des === null) {
                des = ""
            } else if (d.des === "ยกเลิกนัด รถไม่พร้อม") {
                des = "รถไม่พร้อม"
            } else if (d.des === "ยกเลิกนัด รถไม่เพียงพอ") {
                des = "รถไม่เพียงพอ"
            } else if (d.des === "ผู้ป่วยยกเลิกนัด") {
                des = "ผู้ป่วยยกเลิกนัด"
            } else if (d.des === "") {
                des = ""
            }
            else {
                deca = d.des
                des = "อื่นๆ"
            }
            if (d.ac_detail === "แนะนำทำ Telemedicine" || d.ac_detail === "ส่งต่อเยี่ยมบ้านโดยโรงพยาบาล" || d.ac_detail === "ส่งต่อเยี่ยมบ้านโดยศูนย์บริการสาธารณสุข" || d.ac_detail === "เข้าเงื่อนไขการขอใช้รถ") {
                d.ac_detail = d.ac_detail
            } else {
                dispass = d.ac_detail
                d.ac_detail = "อื่นๆ"
            }

            return {
                "ลำดับที่": d.fm_id,
                "ชื่อโรงพยาบาล": d.hos_name,
                "ช่องทางเข้ารับบริการ": d.way,
                "วันที่จอง": `${d.date.getDate()}/${d.date.getMonth() + 1}/${d.date.getFullYear() + 543}`,
                "เวลาที่จอง": `${d.date.getHours()}:${d.date.getMinutes()}:${d.date.getSeconds()}`,
                "เลขบัตรประชาชน": d.citizen,
                "คำนำหน้าชื่อ": d.pre_name,
                "ชื่อ": d.fname,
                "นามสกุล": d.lname,
                "อายุ(ปี)": d.age,
                "ผู้สูงอายุ": condition[0],
                "คนพิการ": condition[6],
                "ผู้มีความยากลำบากเข้าถึงบริการ": condition[14],
                "การเห็น": condition[7],
                "การได้ยินหรือสื่อความหมาย": condition[8],
                "การเคลื่อนไหวหรือทางร่างกาย": condition[9],
                "จิตใจหรือพฤติกรรม": condition[10],
                "สติปัญญา": condition[11],
                "การเรียนรู้": condition[12],
                "ออทิสติก": condition[13],
                "ADL 5-12": condition[1],
                "มีปัญหาด้านการเคลื่อนไหว": condition[2],
                "มีนัดรักษาต่อเนื่องกับโรงพยาบาล": condition[3],
                "มีปัญหาด้านเศรษฐานะ": condition[4],
                "อื่น ๆ ระบุ": condition[5],
                "เงื่อนไขระบุ": condn,
                "ไม่เข้าเงื่อนไขระบุ": dispass,
                "บ้านเลขที่": d.house,
                "ถนน": d.street,
                "แขวง": d.subdis,
                "เขต": d.district01,
                "จังหวัด": d.province,
                "รหัสไปรษณี": d.zipcode,
                "เบอร์โทรศัพท์": d.call,
                "วันที่ขอรถ": `${d.dateres.getDate()}/${d.dateres.getMonth() + 1}/${d.dateres.getFullYear() + 543}`,
                "เวลาที่ขอรถ": `${d.dateres.getHours()}:${d.dateres.getMinutes()}:${d.dateres.getSeconds()}`,
                "วิธีการ": d.met_name,
                "สถานที่ต้นทาง": d.start.split(" ")[0],
                "เลขที่ต้นทาง": d.start.split(" ")[1],
                "ถนนต้นทาง": d.start.split(" ")[2],
                "แขวงต้นทาง": d.start.split(" ")[3],
                "เขตต้นทาง": d.start.split(" ")[4],
                "จังหวัดต้นทาง": d.start.split(" ")[5],
                "รหัสไปรษณีต้นทาง": d.start.split(" ")[6],
                "สถานที่ปลายทาง": d.end.split(" ")[0],
                "เลขที่ปลายทาง": d.end.split(" ")[1],
                "ถนนปลายทาง": d.end.split(" ")[2],
                "แขวงปลายทาง": d.end.split(" ")[3],
                "เขตปลายทาง": d.end.split(" ")[4],
                "จังหวัดปลายทาง": d.end.split(" ")[5],
                "รหัสไปรษณีปลายทาง": d.end.split(" ")[6],
                "วันส่งข้อมูล": date,
                "เวลาส่งข้อมูล": time,
                "ชื่อผู้บันทึก": d.editer,
                "สรุปผลการให้บริการ": d.ac_detail,
                "ระยะทาง(กม.)": d.distance,
                "เวลาไป": d.c_start,
                "เวลากลับ": d.c_end,
                "สถานะ": String(d.status),
                "หมายเหตุยกเลิก": des,
                "ยกเลิกระบุ": deca,
                "ทะเบียนรถ": d.car_name,
                "ประเภทรถ": d.car_type,
                "ประเภทรถอื่นๆ": d.car_other,
                "วันที่บริการสำเร็จ": cmd,
                "เวลาบริการสำเร็จ": cmt,

            }
        })
        res.send(t1)
    })
})

app.get("/form2/:id", jsonParser, (req, res, next) => {
    const id = req.params.id
    conn2.query("SELECT * FROM formcom WHERE formcom.fm_id = ?", [id], (err, t1) => {
        t1 = t1.map(d => {
            if (d.date != null)
                d.date = "วันที่ " + formatDate(d.date.toISOString().split('T')[0]) + " เวลา " + (d.date.toISOString().split('T')[1]).split(".")[0] + " น.";
            if (d.dateres != null)
                d.dateres = " วันที่ " + formatDate(d.dateres.toISOString().split('T')[0]) + " เวลา " + (d.dateres.toISOString().split('T')[1]).split(".")[0] + " น.";
            return d;
        })
        res.send(t1)
    })
})

app.post('/status2', jsonParser, (req, res, next) => {
    var Isql = "INSERT INTO `carsmanage` (`us_id`, `fm_id`, `distance`, `car_name`, `car_type`, `car_other`, `c_start`, `c_end`, `cm_status`, `cm_date`, `des`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    var IV = [req.body.us_id, req.body.fm_id, req.body.distance, req.body.car_name, 1, null, req.body.cstart, req.body.cend, req.body.cm_status, req.body.cm_date, req.body.des]
    conn2.execute(Isql, IV, (err, results, fields) => {
        // console.log(res)
        if (err) {
            res.json({ status: 'error', massage: err })
            //return
        } else
            res.json({ status: 'ok' })

    })
})

app.put("/statu2/edit/:id", jsonParser, (req, res, next) => {
    const id = req.params.id
    const sql = "UPDATE `carsmanage` SET distance = ?, car_name = ?, car_type = ?, car_other = ?, c_start = ?, c_end = ? WHERE `carsmanage`.`cm_id` = ?";
    conn2.execute(sql, [req.body.dis, req.body.car_name, req.body.car_type, req.body.car_other, req.body.cs, req.body.ce, id], (err, ev, fields) => {
        if (err) {
            res.json({ status: "erorr", massage: err });
            //return;
        } else {
            res.json({ status: "ok" })
        }
    })
})

app.get("/add2", (req, res) => {
    res.send(data)
})

app.get("/excal2/:id", (req, res) => {
    var id = req.params.id
    var sql = "SELECT * FROM formcom WHERE hos_id = ? ORDER BY fm_id ASC"
    if (id === "14")
        sql = "SELECT * FROM formcom ORDER BY fm_id ASC"
    conn2.query(sql, [id], (err, t1) => {

        if (err) {
            res.json({ status: "erorr", massage: err });
        }
        else {

            var wb = new xl.Workbook();
            var ws = wb.addWorksheet('Sheet 1');

            ws.cell(1, 1).string("ลำดับที่");
            ws.cell(1, 2).string("โรงพยาบาล");
            ws.cell(1, 3).string("ช่องทางเข้ารับบริการ");
            ws.cell(1, 4).string("วันที่จอง");
            ws.cell(1, 5).string("เวลาที่จอง");
            ws.cell(1, 6).string("เลขบัตรประชาชน");
            ws.cell(1, 7).string("คำนำหน้าชื่อ");
            ws.cell(1, 8).string("ชื่อ");
            ws.cell(1, 9).string("นามสกุล");
            ws.cell(1, 10).string("อายุ(ปี)");
            ws.cell(1, 11).string("ผู้สูงอายุ");
            ws.cell(1, 12).string("คนพิการ");
            ws.cell(1, 13).string("ผู้มีความยากลำบากเข้าถึงบริการ");
            ws.cell(1, 14).string("การเห็น");  // shifted to account for the new column
            ws.cell(1, 15).string("การได้ยินหรือสื่อความหมาย");
            ws.cell(1, 16).string("การเคลื่อนไหวหรือทางร่างกาย");
            ws.cell(1, 17).string("จิตใจหรือพฤติกรรม");
            ws.cell(1, 18).string("สติปัญญา");
            ws.cell(1, 19).string("การเรียนรู้");
            ws.cell(1, 20).string("ออทิสติก");
            ws.cell(1, 21).string("ADL 5-12");
            ws.cell(1, 22).string("มีปัญหาด้านการเคลื่อนไหว");
            ws.cell(1, 23).string("มีนัดรักษาต่อเนื่องกับโรงพยาบาล");
            ws.cell(1, 24).string("มีปัญหาด้านเศรษฐานะ");
            ws.cell(1, 25).string("อื่น ๆ ระบุ");
            ws.cell(1, 26).string("เงื่อนไขระบุ");
            ws.cell(1, 27).string("ไม่เข้าเงื่อนไขระบุ");
            ws.cell(1, 28).string("บ้านเลขที่");
            ws.cell(1, 29).string("ถนน");
            ws.cell(1, 30).string("แขวง");
            ws.cell(1, 31).string("เขต");
            ws.cell(1, 32).string("จังหวัด");
            ws.cell(1, 33).string("รหัสไปรษณี");
            ws.cell(1, 34).string("เบอร์โทรศัพท์");
            ws.cell(1, 35).string("วันที่ขอรถ");
            ws.cell(1, 36).string("เวลาที่ขอรถ");
            ws.cell(1, 37).string("วิธีการ");
            ws.cell(1, 38).string("สถานที่ต้นทาง");
            ws.cell(1, 39).string("เลขที่ต้นทาง");
            ws.cell(1, 40).string("ถนนต้นทาง");
            ws.cell(1, 41).string("แขวงต้นทาง");
            ws.cell(1, 42).string("เขตต้นทาง");
            ws.cell(1, 43).string("จังหวัดต้นทาง");
            ws.cell(1, 44).string("รหัสไปรษณีต้นทาง");
            ws.cell(1, 45).string("สถานที่ปลายทาง");
            ws.cell(1, 46).string("เลขที่ปลายทาง");
            ws.cell(1, 47).string("ถนนปลายทาง");
            ws.cell(1, 48).string("แขวงปลายทาง");
            ws.cell(1, 49).string("เขตปลายทาง");
            ws.cell(1, 50).string("จังหวัดปลายทาง");
            ws.cell(1, 51).string("รหัสไปรษณีปลายทาง");
            ws.cell(1, 52).string("วันส่งข้อมูล");
            ws.cell(1, 53).string("เวลาส่งข้อมูล");
            ws.cell(1, 54).string("ชื่อผู้บันทึก");
            ws.cell(1, 55).string("สรุปผลการให้บริการ");
            ws.cell(1, 56).string("ระยะทาง(กม.)");
            ws.cell(1, 57).string("เวลาไป");
            ws.cell(1, 58).string("เวลากลับ");
            ws.cell(1, 59).string("สถานะ");
            ws.cell(1, 60).string("หมายเหตุยกเลิก");
            ws.cell(1, 61).string("ยกเลิกระบุ");
            ws.cell(1, 62).string("ทะเบียนรถ");
            ws.cell(1, 63).string("ประเภทรถ");
            ws.cell(1, 64).string("ประเภทรถอื่นๆ");
            ws.cell(1, 65).string("วันที่บริการสำเร็จ");
            ws.cell(1, 66).string("เวลาบริการสำเร็จ");
            // ws.cell(1, 53).string("สถานะขอรถ");

            t1.map((t, i) => {

                var start
                var end
                var condition
                var condn = "-"
                var dispass = "-"
                var time
                var date
                var cmd
                var cmt
                var deca = "-"
                var des


                if (t.start.split(" "))
                    start = t.start.split(" ")
                else
                    start = t.start

                if (t.end.split(" "))
                    end = t.end.split(" ")
                else
                    end = t.end

                if (t.condition.split(", ")) {
                    condition = t.condition.split(", ")
                    for (var j = 0; j <= 14; j++) {
                        if (condition[j] === "-" || condition[j] === undefined)
                            condition[j] = 0
                        else {
                            if (j === 5) {
                                condn = condition[j]
                            }
                            condition[j] = 1
                        }
                    }
                }
                else {
                    condition = t.condition
                }


                if (t.fm_time === null) {
                    date = null
                    time = null
                }
                else {
                    date = `${t.fm_time.getDate()}/${t.fm_time.getMonth() + 1}/${t.fm_time.getFullYear() + 543}`
                    time = `${t.fm_time.getHours()}:${t.fm_time.getMinutes()}:${t.fm_time.getSeconds()}`
                }

                if (t.cm_date === null) {
                    cmd = null
                    cmt = null
                }
                else {
                    cmd = `${t.cm_date.getDate()}/${t.cm_date.getMonth() + 1}/${t.cm_date.getFullYear() + 543}`
                    cmt = `${t.cm_date.getHours()}:${t.cm_date.getMinutes()}:${t.cm_date.getSeconds()}`
                }

                if (t.distance === null) {
                    t.distance = 0
                }
                // if (t.met_name === "-") {
                //     t.met_name = "ไม่เข้าเงื่อนไขการขอใช้รถ"
                // }
                if (t.status === null) {
                    t.status = "รอดำเนินการ"
                    if (t.ac_detail !== "เข้าเงื่อนไขการขอใช้รถ") {
                        t.status = "แนะนำบริการอื่น"
                    }
                }
                if (t.status === 1) {
                    t.status = "ดำเนินการสำเร็จ"
                }
                if (t.status === 0) {
                    t.status = "ยกเลิก"
                }
                if (t.des === null) {
                    des = ""
                } else if (t.des === "ยกเลิกนัด รถไม่พร้อม") {
                    des = "รถไม่พร้อม"
                } else if (t.des === "ยกเลิกนัด รถไม่เพียงพอ") {
                    des = "รถไม่เพียงพอ"
                } else if (t.des === "ผู้ป่วยยกเลิกนัด") {
                    des = "ผู้ป่วยยกเลิกนัด"
                } else if (t.des === "") {
                    des = ""
                }
                else {
                    deca = t.des
                    des = "อื่นๆ"
                }
                if (t.ac_detail === "แนะนำทำ Telemedicine" || t.ac_detail === "ส่งต่อเยี่ยมบ้านโดยโรงพยาบาล" || t.ac_detail === "ส่งต่อเยี่ยมบ้านโดยศูนย์บริการสาธารณสุข" || t.ac_detail === "เข้าเงื่อนไขการขอใช้รถ") {
                    t.ac_detail = t.ac_detail
                } else {
                    dispass = t.ac_detail
                    t.ac_detail = "อื่นๆ"
                }


                ws.cell(i + 2, 1).number(t.fm_id);
                ws.cell(i + 2, 2).string(t.hos_name);
                ws.cell(i + 2, 3).string(t.way);
                ws.cell(i + 2, 4).string(`${t.date.getDate()}/${t.date.getMonth() + 1}/${t.date.getFullYear() + 543}`);
                ws.cell(i + 2, 5).string(`${t.date.getHours()}:${t.date.getMinutes()}:${t.date.getSeconds()}`);
                ws.cell(i + 2, 6).string(t.citizen);
                ws.cell(i + 2, 7).string(t.pre_name);
                ws.cell(i + 2, 8).string(t.fname);
                ws.cell(i + 2, 9).string(t.lname);
                ws.cell(i + 2, 10).number(t.age);
                ws.cell(i + 2, 11).number(condition[0]);
                ws.cell(i + 2, 12).number(condition[6]);
                ws.cell(i + 2, 13).number(condition[14]);
                ws.cell(i + 2, 14).number(condition[7]);
                ws.cell(i + 2, 15).number(condition[8]);
                ws.cell(i + 2, 16).number(condition[9]);
                ws.cell(i + 2, 17).number(condition[10]);
                ws.cell(i + 2, 18).number(condition[11]);
                ws.cell(i + 2, 19).number(condition[12]);
                ws.cell(i + 2, 20).number(condition[13]);
                ws.cell(i + 2, 21).number(condition[1]);
                ws.cell(i + 2, 22).number(condition[2]);
                ws.cell(i + 2, 23).number(condition[3]);
                ws.cell(i + 2, 24).number(condition[4]);
                ws.cell(i + 2, 25).number(condition[5]);
                ws.cell(i + 2, 26).string(condn);
                ws.cell(i + 2, 27).string(dispass);
                ws.cell(i + 2, 28).string(t.house);
                ws.cell(i + 2, 29).string(t.street);
                ws.cell(i + 2, 30).string(t.subdis);
                ws.cell(i + 2, 31).string(t.district01);
                ws.cell(i + 2, 32).string(t.province);
                ws.cell(i + 2, 33).string(t.zipcode);
                ws.cell(i + 2, 34).string(t.call);
                ws.cell(i + 2, 35).string(`${t.dateres.getDate()}/${t.dateres.getMonth() + 1}/${t.dateres.getFullYear() + 543}`);
                ws.cell(i + 2, 36).string(`${t.dateres.getHours()}:${t.dateres.getMinutes()}:${t.dateres.getSeconds()}`);
                ws.cell(i + 2, 37).string(t.met_name);
                ws.cell(i + 2, 38).string(start[0]);
                ws.cell(i + 2, 39).string(start[1]);
                ws.cell(i + 2, 40).string(start[2]);
                ws.cell(i + 2, 41).string(start[3]);
                ws.cell(i + 2, 42).string(start[4]);
                ws.cell(i + 2, 43).string(start[5]);
                ws.cell(i + 2, 44).string(start[6]);
                ws.cell(i + 2, 45).string(end[0]);
                ws.cell(i + 2, 46).string(end[1]);
                ws.cell(i + 2, 47).string(end[2]);
                ws.cell(i + 2, 48).string(end[3]);
                ws.cell(i + 2, 49).string(end[4]);
                ws.cell(i + 2, 50).string(end[5]);
                ws.cell(i + 2, 51).string(end[6]);
                // ws.cell(i + 2, 51).string(end[7]);
                ws.cell(i + 2, 52).string(date);
                ws.cell(i + 2, 53).string(time);
                ws.cell(i + 2, 54).string(t.editer);
                ws.cell(i + 2, 55).string(t.ac_detail);
                ws.cell(i + 2, 56).number(t.distance);
                ws.cell(i + 2, 57).string(t.c_start);
                ws.cell(i + 2, 58).string(t.c_end);
                ws.cell(i + 2, 59).string(String(t.status));
                ws.cell(i + 2, 60).string(des);
                ws.cell(i + 2, 61).string(deca);
                ws.cell(i + 2, 62).string(t.car_name);
                ws.cell(i + 2, 63).string(t.car_type);
                ws.cell(i + 2, 64).string(t.car_other);
                ws.cell(i + 2, 65).string(cmd);
                ws.cell(i + 2, 66).string(cmt);
                // ws.cell(i + 2, 53).number(t.fm_ac);
            }
            )
            wb.write('ExcelFile.xlsx', res);
        }
    }
    )

})

function formatDate(inputDate) {
    const date = new Date(inputDate);

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const formattedDate = `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year + 543}`;

    return formattedDate;
}

//table qury
app.get("/report", (req, res, next) => {
    const hospital = parseInt(req.query.hospital);
    const status = req.query.status;
    const between1 = req.query.between1;
    const between2 = req.query.between2
    const page = parseInt(req.query.page);
    const per_page = parseInt(req.query.per_page);
    const sort_column = req.query.sort_column;
    const sort_direction = req.query.sort_direction;
    const search = req.query.search;

    const start_idx = (page - 1) * per_page

    var params = [];
    var params2 = [];
    var sql = "SELECT * FROM formcom WHERE fm_ac = 1"
    var sql2 = "SELECT COUNT(fm_id) as total FROM formcom WHERE fm_ac = 1"
    if (hospital && hospital !== 14) {
        sql += " AND hos_id = ?"
        sql2 += " AND hos_id = ?"
        params.push(hospital)
        params2.push(hospital)
    }
    if (status) {
        if (status === "null" || status === "NULL") {
            sql += " AND status is null"
            sql2 += " AND status is null"
        } else {
            sql += " AND status = ?"
            sql2 += " AND status = ?"
            params.push(status)
            params2.push(status)
        }
    }
    //  else if (status) {
    //     if (status === "null" || status === "NULL") {
    //         sql += " WHERE status is null"
    //     } else {
    //         sql += " WHERE status = ?"
    //         params.push(status)
    //     }
    // }
    if (between1 || between2) {
        if (between1 && between2) {
            sql += " AND STR_TO_DATE(date,'%Y-%m-%d') >= ? AND STR_TO_DATE(date,'%Y-%m-%d') <= ?"
            sql2 += " AND STR_TO_DATE(date,'%Y-%m-%d') >= ? AND STR_TO_DATE(date,'%Y-%m-%d') <= ?"
            params.push(between1)
            params.push(between2)
            params2.push(between1)
            params2.push(between2)
        } else if (between1) {
            sql += " AND STR_TO_DATE(date,'%Y-%m-%d') >= ?"
            sql2 += " AND STR_TO_DATE(date,'%Y-%m-%d') >= ?"
            params.push(between1)
            params2.push(between1)

        } else if (between2) {
            sql += " AND STR_TO_DATE(date,'%Y-%m-%d') <= ?"
            sql2 += " AND STR_TO_DATE(date,'%Y-%m-%d') <= ?"
            params.push(between2)
            params2.push(between2)
        }
    }
    //  else if (!hospital && !status) {
    //     if (between1 && between2) {
    //         sql += " WHERE dateres >= ? AND dateres <= ?"
    //         params.push(between1)
    //         params.push(between2)
    //     } else if (between1) {
    //         sql += " WHERE dateres >= ?"
    //         params.push(between1)
    //     } else if (between2) {
    //         sql += " WHERE dateres <= ?"
    //         params.push(between2)
    //     }
    // }
    if (search) {
        sql += " AND (fname LIKE ? OR lname LIKE ?)"
        sql2 += " AND (fname LIKE ? OR lname LIKE ?)"
        params.push("%" + search + "%", "%" + search + "%")
        params2.push("%" + search + "%", "%" + search + "%")
    }
    if (sort_column) {
        sql += " ORDER BY " + sort_column + " " + sort_direction
        sql2 += " ORDER BY " + sort_column + " " + sort_direction
    } else {
        sql += " ORDER BY status ASC, dateres ASC"
        sql2 += " ORDER BY status ASC, dateres ASC"
    }

    sql += " LIMIT ?, ?"
    params.push(start_idx)
    params.push(per_page)

    conn2.query(sql2, params, (req, ee, fields) => {
        conn2.query(sql, params, (req, results, fields) => {
            //console.log(sql, params)
            var total = ee[0]["total"]
            var total_pages = Math.ceil(ee[0]["total"] / per_page)

            // if (hospital || status || between1 || between2) {
            //     total = results.length
            //     total_pages = Math.ceil(results.length / per_page)
            // }
            results = results.map(d => {
                if (d.date != null)
                    d.date = formatDate(d.date.toISOString().split('T')[0]);
                if (d.dateres != null)
                    d.dateres = formatDate(d.dateres.toISOString().split('T')[0]) + " " + ((d.dateres.toISOString().split('T')[1]).split(".")[0]).split(":")[0] + ":" + ((d.dateres.toISOString().split('T')[1]).split(".")[0]).split(":")[1];
                return d;
            })
            res.json({ page: page, per_page: per_page, total: total, total_pages: total_pages, data: results })
        })
    })

})

app.get("/excel2", (req, res) => {
    const hospital = parseInt(req.query.hospital);
    const status = req.query.status;
    const between1 = req.query.between1;
    const between2 = req.query.between2
    const sort_column = req.query.sort_column;
    const sort_direction = req.query.sort_direction;
    const search = req.query.search;

    var params = [];
    var sql = "SELECT * FROM formcom WHERE fm_ac = 1"
    if (hospital && hospital !== 14) {
        sql += " AND hos_id = ?"
        params.push(hospital)
    }
    if (status) {
        if (status === "null" || status === "NULL") {
            sql += " AND status is null"
        } else {
            sql += " AND status = ?"
            params.push(status)
        }
    }
    if (between1 || between2) {
        if (between1 && between2) {
            sql += " AND STR_TO_DATE(date,'%Y-%m-%d') >= ? AND STR_TO_DATE(date,'%Y-%m-%d') <= ?"
            params.push(between1)
            params.push(between2)
        } else if (between1) {
            sql += " AND STR_TO_DATE(date,'%Y-%m-%d') >= ?"
            params.push(between1)

        } else if (between2) {
            sql += " AND STR_TO_DATE(date,'%Y-%m-%d') <= ?"
            params.push(between2)
        }
    }

    if (search) {
        sql += " AND (fname LIKE ? OR lname LIKE ?)"
        params.push("%" + search + "%", "%" + search + "%")
    }
    if (sort_column) {
        sql += " ORDER BY " + sort_column + " " + sort_direction
    } else {
        sql += " ORDER BY status ASC, dateres ASC"
    }


    conn2.query(sql, params, (err, t1, fields) => {
        //console.log(sql, params)

        if (err) {
            res.json({ status: "erorr", massage: err });
        }
        else {

            var wb = new xl.Workbook();
            var ws = wb.addWorksheet('Sheet 1');

            ws.cell(1, 1).string("ลำดับที่");
            ws.cell(1, 2).string("โรงพยาบาล");
            ws.cell(1, 3).string("ช่องทางเข้ารับบริการ");
            ws.cell(1, 4).string("วันที่จอง");
            ws.cell(1, 5).string("เวลาที่จอง");
            ws.cell(1, 6).string("เลขบัตรประชาชน");
            ws.cell(1, 7).string("คำนำหน้าชื่อ");
            ws.cell(1, 8).string("ชื่อ");
            ws.cell(1, 9).string("นามสกุล");
            ws.cell(1, 10).string("อายุ(ปี)");
            ws.cell(1, 11).string("ผู้สูงอายุ");
            ws.cell(1, 12).string("คนพิการ");
            ws.cell(1, 13).string("ผู้มีความยากลำบากเข้าถึงบริการ");
            ws.cell(1, 14).string("การเห็น");  // shifted to account for the new column
            ws.cell(1, 15).string("การได้ยินหรือสื่อความหมาย");
            ws.cell(1, 16).string("การเคลื่อนไหวหรือทางร่างกาย");
            ws.cell(1, 17).string("จิตใจหรือพฤติกรรม");
            ws.cell(1, 18).string("สติปัญญา");
            ws.cell(1, 19).string("การเรียนรู้");
            ws.cell(1, 20).string("ออทิสติก");
            ws.cell(1, 21).string("ADL 5-12");
            ws.cell(1, 22).string("มีปัญหาด้านการเคลื่อนไหว");
            ws.cell(1, 23).string("มีนัดรักษาต่อเนื่องกับโรงพยาบาล");
            ws.cell(1, 24).string("มีปัญหาด้านเศรษฐานะ");
            ws.cell(1, 25).string("อื่น ๆ ระบุ");
            ws.cell(1, 26).string("เงื่อนไขระบุ");
            ws.cell(1, 27).string("ไม่เข้าเงื่อนไขระบุ");
            ws.cell(1, 28).string("บ้านเลขที่");
            ws.cell(1, 29).string("ถนน");
            ws.cell(1, 30).string("แขวง");
            ws.cell(1, 31).string("เขต");
            ws.cell(1, 32).string("จังหวัด");
            ws.cell(1, 33).string("รหัสไปรษณี");
            ws.cell(1, 34).string("เบอร์โทรศัพท์");
            ws.cell(1, 35).string("วันที่ขอรถ");
            ws.cell(1, 36).string("เวลาที่ขอรถ");
            ws.cell(1, 37).string("วิธีการ");
            ws.cell(1, 38).string("สถานที่ต้นทาง");
            ws.cell(1, 39).string("เลขที่ต้นทาง");
            ws.cell(1, 40).string("ถนนต้นทาง");
            ws.cell(1, 41).string("แขวงต้นทาง");
            ws.cell(1, 42).string("เขตต้นทาง");
            ws.cell(1, 43).string("จังหวัดต้นทาง");
            ws.cell(1, 44).string("รหัสไปรษณีต้นทาง");
            ws.cell(1, 45).string("สถานที่ปลายทาง");
            ws.cell(1, 46).string("เลขที่ปลายทาง");
            ws.cell(1, 47).string("ถนนปลายทาง");
            ws.cell(1, 48).string("แขวงปลายทาง");
            ws.cell(1, 49).string("เขตปลายทาง");
            ws.cell(1, 50).string("จังหวัดปลายทาง");
            ws.cell(1, 51).string("รหัสไปรษณีปลายทาง");
            ws.cell(1, 52).string("วันส่งข้อมูล");
            ws.cell(1, 53).string("เวลาส่งข้อมูล");
            ws.cell(1, 54).string("ชื่อผู้บันทึก");
            ws.cell(1, 55).string("สรุปผลการให้บริการ");
            ws.cell(1, 56).string("ระยะทาง(กม.)");
            ws.cell(1, 57).string("เวลาไป");
            ws.cell(1, 58).string("เวลากลับ");
            ws.cell(1, 59).string("สถานะ");
            ws.cell(1, 60).string("หมายเหตุยกเลิก");
            ws.cell(1, 61).string("ยกเลิกระบุ");
            ws.cell(1, 62).string("ทะเบียนรถ");
            ws.cell(1, 63).string("ประเภทรถ");
            ws.cell(1, 64).string("ประเภทรถอื่นๆ");
            ws.cell(1, 65).string("วันที่บริการสำเร็จ");
            ws.cell(1, 66).string("เวลาบริการสำเร็จ");

            t1.map((t, i) => {

                var start
                var end
                var condition
                var condn = "-"
                var dispass = "-"
                var time
                var date
                var cmd
                var cmt
                var deca = "-"
                var des


                if (t.start.split(" "))
                    start = t.start.split(" ")
                else
                    start = t.start

                if (t.end.split(" "))
                    end = t.end.split(" ")
                else
                    end = t.end

                if (t.condition.split(", ")) {
                    condition = t.condition.split(", ")
                    for (var j = 0; j <= 14; j++) {
                        if (condition[j] === "-")
                            condition[j] = 0
                        else {
                            if (j === 5) {
                                condn = condition[j]
                            }
                            condition[j] = 1
                        }

                    }
                }
                else {
                    condition = t.condition
                }


                if (t.fm_time === null) {
                    date = null
                    time = null
                }
                else {
                    date = `${t.fm_time.getDate()}/${t.fm_time.getMonth() + 1}/${t.fm_time.getFullYear() + 543}`
                    time = `${t.fm_time.getHours()}:${t.fm_time.getMinutes()}:${t.fm_time.getSeconds()}`
                }

                if (t.cm_date === null) {
                    cmd = null
                    cmt = null
                }
                else {
                    cmd = `${t.cm_date.getDate()}/${t.cm_date.getMonth() + 1}/${t.cm_date.getFullYear() + 543}`
                    cmt = `${t.cm_date.getHours()}:${t.cm_date.getMinutes()}:${t.cm_date.getSeconds()}`
                }

                if (t.distance === null) {
                    t.distance = 0
                }
                // if (t.met_name === "-") {
                //     t.met_name = "ไม่เข้าเงื่อนไขการขอใช้รถ"
                // }
                if (t.status === null) {
                    t.status = "รอดำเนินการ"
                    if (t.ac_detail !== "เข้าเงื่อนไขการขอใช้รถ") {
                        t.status = "แนะนำบริการอื่น"
                    }
                }
                if (t.status === 1) {
                    t.status = "ดำเนินการสำเร็จ"
                }
                if (t.status === 0) {
                    t.status = "ยกเลิก"
                }
                if (t.des === null) {
                    des = ""
                } else if (t.des === "ยกเลิกนัด รถไม่พร้อม") {
                    des = "รถไม่พร้อม"
                } else if (t.des === "ยกเลิกนัด รถไม่เพียงพอ") {
                    des = "รถไม่เพียงพอ"
                } else if (t.des === "ผู้ป่วยยกเลิกนัด") {
                    des = "ผู้ป่วยยกเลิกนัด"
                } else if (t.des === "") {
                    des = ""
                }
                else {
                    deca = t.des
                    des = "อื่นๆ"
                }

                ws.cell(i + 2, 1).number(t.fm_id);
                ws.cell(i + 2, 2).string(t.hos_name);
                ws.cell(i + 2, 3).string(t.way);
                ws.cell(i + 2, 4).string(`${t.date.getDate()}/${t.date.getMonth() + 1}/${t.date.getFullYear() + 543}`);
                ws.cell(i + 2, 5).string(`${t.date.getHours()}:${t.date.getMinutes()}:${t.date.getSeconds()}`);
                ws.cell(i + 2, 6).string(t.citizen);
                ws.cell(i + 2, 7).string(t.pre_name);
                ws.cell(i + 2, 8).string(t.fname);
                ws.cell(i + 2, 9).string(t.lname);
                ws.cell(i + 2, 10).number(t.age);
                ws.cell(i + 2, 11).number(condition[0]);
                ws.cell(i + 2, 12).number(condition[6]);
                ws.cell(i + 2, 13).number(condition[14]);
                ws.cell(i + 2, 14).number(condition[7]);
                ws.cell(i + 2, 15).number(condition[8]);
                ws.cell(i + 2, 16).number(condition[9]);
                ws.cell(i + 2, 17).number(condition[10]);
                ws.cell(i + 2, 18).number(condition[11]);
                ws.cell(i + 2, 19).number(condition[12]);
                ws.cell(i + 2, 20).number(condition[13]);
                ws.cell(i + 2, 21).number(condition[1]);
                ws.cell(i + 2, 22).number(condition[2]);
                ws.cell(i + 2, 23).number(condition[3]);
                ws.cell(i + 2, 24).number(condition[4]);
                ws.cell(i + 2, 25).number(condition[5]);
                ws.cell(i + 2, 26).string(condn);
                ws.cell(i + 2, 27).string(dispass);
                ws.cell(i + 2, 28).string(t.house);
                ws.cell(i + 2, 29).string(t.street);
                ws.cell(i + 2, 30).string(t.subdis);
                ws.cell(i + 2, 31).string(t.district01);
                ws.cell(i + 2, 32).string(t.province);
                ws.cell(i + 2, 33).string(t.zipcode);
                ws.cell(i + 2, 34).string(t.call);
                ws.cell(i + 2, 35).string(`${t.dateres.getDate()}/${t.dateres.getMonth() + 1}/${t.dateres.getFullYear() + 543}`);
                ws.cell(i + 2, 36).string(`${t.dateres.getHours()}:${t.dateres.getMinutes()}:${t.dateres.getSeconds()}`);
                ws.cell(i + 2, 37).string(t.met_name);
                ws.cell(i + 2, 38).string(start[0]);
                ws.cell(i + 2, 39).string(start[1]);
                ws.cell(i + 2, 40).string(start[2]);
                ws.cell(i + 2, 41).string(start[3]);
                ws.cell(i + 2, 42).string(start[4]);
                ws.cell(i + 2, 43).string(start[5]);
                ws.cell(i + 2, 44).string(start[6]);
                ws.cell(i + 2, 45).string(end[0]);
                ws.cell(i + 2, 46).string(end[1]);
                ws.cell(i + 2, 47).string(end[2]);
                ws.cell(i + 2, 48).string(end[3]);
                ws.cell(i + 2, 49).string(end[4]);
                ws.cell(i + 2, 50).string(end[5]);
                ws.cell(i + 2, 51).string(end[6]);
                ws.cell(i + 2, 52).string(date);
                ws.cell(i + 2, 53).string(time);
                ws.cell(i + 2, 54).string(t.editer);
                ws.cell(i + 2, 55).string(t.ac_detail);
                ws.cell(i + 2, 56).number(t.distance);
                ws.cell(i + 2, 57).string(t.c_start);
                ws.cell(i + 2, 58).string(t.c_end);
                ws.cell(i + 2, 59).string(String(t.status));
                ws.cell(i + 2, 60).string(des);
                ws.cell(i + 2, 61).string(deca);
                ws.cell(i + 2, 62).string(t.car_name);
                ws.cell(i + 2, 63).string(t.car_type);
                ws.cell(i + 2, 64).string(t.car_other);
                ws.cell(i + 2, 65).string(cmd);
                ws.cell(i + 2, 66).string(cmt);
            }
            )
            wb.write('ExcelFile.xlsx', res);
        }


    })
})

//dashboard
app.get("/dash/1", jsonParser, (req, res) => {
    var hospital = req.query.hospital
    var sql = 'select count(fm_id) as total, count(case when met_name = "ไป-กลับ" then fm_id end) as met1, count(case when met_name = "เที่ยวเดียว" then fm_id end) as met2, count(case when met_name = "ไม่เข้าเงื่อนไขการขอใช้รถ" then fm_id end) as met3 from formcom'
    var params = []
    if (hospital) {
        sql += " WHERE hos_id = ?"
        params.push(hospital)
    }
    conn2.query(sql, params, (err, dash) => {
        //console.log(sql, params)
        res.send(dash)
    })
})

app.get("/dash/2", jsonParser, (req, res) => {
    var hospital = req.query.hospital
    var sql = 'select count(fm_id) as total, count(case when status = 1 then fm_id end) as met1, count(case when status = 0 then fm_id end) as met2, count(case when status is NULL then fm_id end) as met3 from formcom'
    var params = []
    if (hospital) {
        sql += " WHERE hos_id = ?"
        params.push(hospital)
    }
    conn2.query(sql, params, (err, dash) => {
        //console.log(sql, params)
        res.send(dash)
    })
})

app.get("/dash/3", jsonParser, (req, res) => {
    var hospital = req.query.hospital
    const status = req.query.status;
    const met = req.query.met;
    //var sql = "select count(fm_id) as total, count(case when `condition` LIKE '%ผู้สูงอายุ%' then fm_id end) as type1, count(case when `condition` LIKE '%คนพิการ%' then fm_id end) as type2, count(case when `condition` LIKE '%ADL 5-12%' then fm_id end) as con1, count(case when `condition` LIKE '%มีปัญหาด้านการเคลื่อนไหว%' then fm_id end) as con2, count(case when `condition` LIKE '%มีนัดรักษาต่อเนื่องกับโรงพยาบาล%' then fm_id end) as con3, count(case when `condition` LIKE '%มีปัญหาด้านเศรษฐานะ%' then fm_id end) as con4, count(case when `condition` LIKE '%การเห็น%' then fm_id end) as dis1, count(case when `condition` LIKE '%การได้ยินหรือสื่อความหมาย%' then fm_id end) as dis2, count(case when `condition` LIKE '%การเคลื่อนไหวหรือทางร่างกาย%' then fm_id end) as dis3, count(case when `condition` LIKE '%จิตใจหรือพฤติกรรม%' then fm_id end) as dis4, count(case when `condition` LIKE '%สติปัญญา%' then fm_id end) as dis5, count(case when `condition` LIKE '%การเรียนรู้%' then fm_id end) as dis6, count(case when `condition` LIKE '%ออทิสติก%' then fm_id end) as dis7 from formcom"
    var sql = "select count(fm_id) as total, count(case when `condition` LIKE '%ผู้สูงอายุ%' then fm_id end) as type1, count(case when `condition` LIKE '%คนพิการ%' then fm_id end) as type2, count(case when `condition` LIKE '%ADL 5-12%' then fm_id end) as con1, count(case when `condition` LIKE '%มีปัญหาด้านการเคลื่อนไหว%' then fm_id end) as con2, count(case when `condition` LIKE '%มีนัดรักษาต่อเนื่องกับโรงพยาบาล%' then fm_id end) as con3, count(case when `condition` LIKE '%มีปัญหาด้านเศรษฐานะ%' then fm_id end) as con4, count(case when `condition` LIKE '%การเห็น%' then fm_id end) as dis1, count(case when `condition` LIKE '%การได้ยินหรือสื่อความหมาย%' then fm_id end) as dis2, count(case when `condition` LIKE '%การเคลื่อนไหวหรือทางร่างกาย%' then fm_id end) as dis3, count(case when `condition` LIKE '%จิตใจหรือพฤติกรรม%' then fm_id end) as dis4, count(case when `condition` LIKE '%สติปัญญา%' then fm_id end) as dis5, count(case when `condition` LIKE '%การเรียนรู้%' then fm_id end) as dis6, count(case when `condition` LIKE '%ออทิสติก%' then fm_id end) as dis7, count(case when ac_detail LIKE '%แนะนำทำ Telemedicine%' then fm_id end) as out1, count(case when ac_detail LIKE '%ส่งต่อเยี่ยมบ้านโดยโรงพยาบาล%' then fm_id end) as out2, count(case when `condition` LIKE '%ส่งต่อเยี่ยมบ้านโดยศูนย์บริการสาธารณสุข%' then fm_id end) as out3 from formcom"
    var params = [];
    if (hospital) {
        sql += " WHERE hos_id = ?"
        params.push(hospital)
        if (status) {
            if (status === "NULL" || status === "null") {
                sql += " AND status is null"
            } else {
                sql += " AND status = ?"
                params.push(status)
            }
        }
        if (met) {
            sql += " AND met_name = ?"
            params.push(met)
        }
    }
    else {

        if (status) {
            if (status === "NULL" || status === "null") {
                sql += " WHERE status is null"
            } else {
                sql += " WHERE status = ?"
                params.push(status)
            }
        }
        if (met) {
            sql += " WHERE met_name = ?"
            params.push(met)
        }
    }

    conn2.query(sql, params, (err, dash) => {
        //console.log(sql, params)
        res.send(dash)
    })
})

app.get("/dash/4", jsonParser, (req, res) => {
    var hospital = req.query.hospital
    const status = req.query.status;
    const met = req.query.met;
    var sql = "select count(fm_id) as total, count(case when hos_id = 1 then fm_id end) as h1, count(case when hos_id = 2 then fm_id end) as h2, count(case when hos_id = 3 then fm_id end) as h3, count(case when hos_id = 4 then fm_id end) as h4, count(case when hos_id = 5 then fm_id end) as h5, count(case when hos_id = 6 then fm_id end) as h6, count(case when hos_id = 7 then fm_id end) as h7, count(case when hos_id = 8 then fm_id end) as h8, count(case when hos_id = 9 then fm_id end) as h9, count(case when hos_id = 10 then fm_id end) as h10, count(case when hos_id = 11 then fm_id end) as h11 from formcom"
    var params = [];
    if (hospital) {
        sql += " WHERE hos_id = ?"
        params.push(hospital)
    }
    if (status && hospital) {
        if (status === "NULL" || status === "null") {
            sql += " AND status is null"
        } else {
            sql += " AND status = ?"
            params.push(status)
        }
    }
    else if (status) {
        if (status === "NULL" || status === "null") {
            sql += " WHERE status is null"
        } else {
            sql += " WHERE status = ?"
            params.push(status)
        }
    }
    if (met && hospital) {
        sql += " AND met_name = ?"
        params.push(met)
    }
    else if (met) {
        sql += " WHERE met_name = ?"
        params.push(met)
    }
    conn2.query(sql, params, (err, dash) => {
        //console.log(sql, params)
        res.send(dash)
    })
})


app.post("/siteup", verifyToken, jsonParser, async (req, res) => {
    try {

        conn2.query("SELECT * FROM formcom ORDER BY fm_id ASC", async (err, t1) => {
            if (err) {
              console.error("Error fetching data from DB:", err);
              return res.status(500).json({ error: "Error fetching data from database" });
            }

            t1 = t1.map(d => {

                var condition
                var condn = "-"
                var dispass = "-"
                var time
                var date
                var cmd
                var cmt
                var deca = "-"
                var des
    
                // const [
                //     elderly, disabilities, difficulty, vision, communication, 
                //     physical, mental, intellectual, learning, autism, 
                //     adl, mobility, scheduled, financial, others
                // ] = d.condition.split(', ').map(s => s.trim());
                // // d.citizen = encode(d.citizen)
                // const conditions = {
                //     elderly, disabilities, difficulty, vision, communication, 
                //     physical, mental, intellectual, learning, autism, 
                //     adl, mobility, scheduled, financial, others
                // }
    
                // Object.keys(conditions).forEach(key => {
                //     conditions[key] = conditions[key] === "-" ? 0 : 1;
                // });
    
                // d.condition = conditions
    
                // if (d.date != null)
                //     d.date = "วันที่ " + formatDate(d.date.toISOString().split('T')[0]) + " เวลา " + (d.date.toISOString().split('T')[1]).split(".")[0] + " น.";
                // if (d.dateres != null)
                //     d.dateres = " วันที่ " + formatDate(d.dateres.toISOString().split('T')[0]) + " เวลา " + (d.dateres.toISOString().split('T')[1]).split(".")[0] + " น.";
                // if (d.fm_time != null)
                //     d.fm_time = " วันที่ " + formatDate(d.fm_time.toISOString().split('T')[0]) + " เวลา " + (d.fm_time.toISOString().split('T')[1]).split(".")[0] + " น.";
    
                if (d.condition.split(", ")) {
                    condition = d.condition.split(", ")
                    for (var j = 0; j <= 14; j++) {
                        if (condition[j] === "-" || condition[j] === undefined)
                            condition[j] = 0
                        else {
                            if (j === 5) {
                                condn = condition[j]
                            }
                            condition[j] = 1
                        }
                    }
                }
                else {
                    condition = d.condition
                }
    
                if (d.fm_time === null) {
                    date = null
                    time = null
                }
                else {
                    date = `${d.fm_time.getDate()}/${d.fm_time.getMonth() + 1}/${d.fm_time.getFullYear() + 543}`
                    time = `${d.fm_time.getHours()}:${d.fm_time.getMinutes()}:${d.fm_time.getSeconds()}`
                }
    
                if (d.cm_date === null) {
                    cmd = null
                    cmt = null
                }
                else {
                    cmd = `${d.cm_date.getDate()}/${d.cm_date.getMonth() + 1}/${d.cm_date.getFullYear() + 543}`
                    cmt = `${d.cm_date.getHours()}:${d.cm_date.getMinutes()}:${d.cm_date.getSeconds()}`
                }
    
                if (d.distance === null) {
                    d.distance = 0
                }
                // if (t.met_name === "-") {
                //     t.met_name = "ไม่เข้าเงื่อนไขการขอใช้รถ"
                // }
                if (d.status === null) {
                    d.status = "รอดำเนินการ"
                    if (d.ac_detail !== "เข้าเงื่อนไขการขอใช้รถ") {
                        d.status = "แนะนำบริการอื่น"
                    }
                }
                if (d.status === 1) {
                    d.status = "ดำเนินการสำเร็จ"
                }
                if (d.status === 0) {
                    d.status = "ยกเลิก"
                }
                if (d.des === null) {
                    des = ""
                } else if (d.des === "ยกเลิกนัด รถไม่พร้อม") {
                    des = "รถไม่พร้อม"
                } else if (d.des === "ยกเลิกนัด รถไม่เพียงพอ") {
                    des = "รถไม่เพียงพอ"
                } else if (d.des === "ผู้ป่วยยกเลิกนัด") {
                    des = "ผู้ป่วยยกเลิกนัด"
                } else if (d.des === "") {
                    des = ""
                }
                else {
                    deca = d.des
                    des = "อื่นๆ"
                }
                if (d.ac_detail === "แนะนำทำ Telemedicine" || d.ac_detail === "ส่งต่อเยี่ยมบ้านโดยโรงพยาบาล" || d.ac_detail === "ส่งต่อเยี่ยมบ้านโดยศูนย์บริการสาธารณสุข" || d.ac_detail === "เข้าเงื่อนไขการขอใช้รถ") {
                    d.ac_detail = d.ac_detail
                } else {
                    dispass = d.ac_detail
                    d.ac_detail = "อื่นๆ"
                }
    
                return {
                    "ลำดับที่": d.fm_id,
                    "ชื่อโรงพยาบาล": d.hos_name,
                    "ช่องทางเข้ารับบริการ": d.way,
                    "วันที่จอง": `${d.date.getDate()}/${d.date.getMonth() + 1}/${d.date.getFullYear() + 543}`,
                    "เวลาที่จอง": `${d.date.getHours()}:${d.date.getMinutes()}:${d.date.getSeconds()}`,
                    "เลขบัตรประชาชน": d.citizen,
                    "คำนำหน้าชื่อ": d.pre_name,
                    "ชื่อ": d.fname,
                    "นามสกุล": d.lname,
                    "อายุ(ปี)": d.age,
                    "ผู้สูงอายุ": Number(condition[0]),
                    "คนพิการ": condition[6],
                    "ผู้มีความยากลำบากเข้าถึงบริการ": condition[14],
                    "การเห็น": condition[7],
                    "การได้ยินหรือสื่อความหมาย": condition[8],
                    "การเคลื่อนไหวหรือทางร่างกาย": condition[9],
                    "จิตใจหรือพฤติกรรม": condition[10],
                    "สติปัญญา": condition[11],
                    "การเรียนรู้": condition[12],
                    "ออทิสติก": condition[13],
                    "ADL 5-12": condition[1],
                    "มีปัญหาด้านการเคลื่อนไหว": condition[2],
                    "มีนัดรักษาต่อเนื่องกับโรงพยาบาล": condition[3],
                    "มีปัญหาด้านเศรษฐานะ": condition[4],
                    "อื่น ๆ ระบุ": condition[5],
                    "เงื่อนไขระบุ": condn,
                    "ไม่เข้าเงื่อนไขระบุ": dispass,
                    "บ้านเลขที่": d.house,
                    "ถนน": d.street,
                    "แขวง": d.subdis,
                    "เขต": d.district01,
                    "จังหวัด": d.province,
                    "รหัสไปรษณี": d.zipcode,
                    "เบอร์โทรศัพท์": d.call,
                    "วันที่ขอรถ": `${d.dateres.getDate()}/${d.dateres.getMonth() + 1}/${d.dateres.getFullYear() + 543}`,
                    "เวลาที่ขอรถ": `${d.dateres.getHours()}:${d.dateres.getMinutes()}:${d.dateres.getSeconds()}`,
                    "วิธีการ": d.met_name,
                    "สถานที่ต้นทาง": d.start.split(" ")[0],
                    "เลขที่ต้นทาง": d.start.split(" ")[1],
                    "ถนนต้นทาง": d.start.split(" ")[2],
                    "แขวงต้นทาง": d.start.split(" ")[3],
                    "เขตต้นทาง": d.start.split(" ")[4],
                    "จังหวัดต้นทาง": d.start.split(" ")[5],
                    "รหัสไปรษณีต้นทาง": d.start.split(" ")[6],
                    "สถานที่ปลายทาง": d.end.split(" ")[0],
                    "เลขที่ปลายทาง": d.end.split(" ")[1],
                    "ถนนปลายทาง": d.end.split(" ")[2],
                    "แขวงปลายทาง": d.end.split(" ")[3],
                    "เขตปลายทาง": d.end.split(" ")[4],
                    "จังหวัดปลายทาง": d.end.split(" ")[5],
                    "รหัสไปรษณีปลายทาง": d.end.split(" ")[6],
                    "วันส่งข้อมูล": date,
                    "เวลาส่งข้อมูล": time,
                    "ชื่อผู้บันทึก": d.editer,
                    "สรุปผลการให้บริการ": d.ac_detail,
                    "ระยะทาง(กม.)": d.distance,
                    "เวลาไป": d.c_start,
                    "เวลากลับ": d.c_end,
                    "สถานะ": String(d.status),
                    "หมายเหตุยกเลิก": des,
                    "ยกเลิกระบุ": deca,
                    "ทะเบียนรถ": d.car_name,
                    "ประเภทรถ": d.car_type,
                    "ประเภทรถอื่นๆ": d.car_other,
                    "วันที่บริการสำเร็จ": cmd,
                    "เวลาบริการสำเร็จ": cmt,
    
                }
            })

        const client = await auth.getClient();
        const sheets = google.sheets({ version: "v4", auth: client });

        const spreadsheetId = "1xsTW3SDuwtVdOoSlAIv6YCrnkZ17VDISnNYzjCOoNZ4"; // ใส่ Spreadsheet ID
        const range = "sheet1"; // ระบุช่วงที่ต้องการอ่าน

        const header = [
            "ลำดับที่", "ชื่อโรงพยาบาล", "ช่องทางเข้ารับบริการ", "วันที่จอง", "เวลาที่จอง", "เลขบัตรประชาชน", "คำนำหน้าชื่อ",
            "ชื่อ", "นามสกุล", "อายุ(ปี)", "ผู้สูงอายุ", "คนพิการ", "ผู้มีความยากลำบากเข้าถึงบริการ", "การเห็น", "การได้ยินหรือสื่อความหมาย",
            "การเคลื่อนไหวหรือทางร่างกาย", "จิตใจหรือพฤติกรรม", "สติปัญญา", "การเรียนรู้", "ออทิสติก", "ADL 5-12", "มีปัญหาด้านการเคลื่อนไหว",
            "มีนัดรักษาต่อเนื่องกับโรงพยาบาล", "มีปัญหาด้านเศรษฐานะ", "อื่น ๆ ระบุ", "เงื่อนไขระบุ", "ไม่เข้าเงื่อนไขระบุ", "บ้านเลขที่", "ถนน",
            "แขวง", "เขต", "จังหวัด", "รหัสไปรษณี", "เบอร์โทรศัพท์", "วันที่ขอรถ", "เวลาที่ขอรถ",
            "วิธีการ", "สถานที่ต้นทาง", "เลขที่ต้นทาง", "ถนนต้นทาง", "แขวงต้นทาง", "เขตต้นทาง", "จังหวัดต้นทาง",
            "รหัสไปรษณีต้นทาง", "สถานที่ปลายทาง", "เลขที่ปลายทาง", "ถนนปลายทาง", "แขวงปลายทาง", "เขตปลายทาง", "จังหวัดปลายทาง",
            "รหัสไปรษณีปลายทาง", "วันส่งข้อมูล", "เวลาส่งข้อมูล", "ชื่อผู้บันทึก", "สรุปผลการให้บริการ", "ระยะทาง(กม.)", "เวลาไป",
            "เวลากลับ", "สถานะ", "หมายเหตุยกเลิก", "ยกเลิกระบุ", "ทะเบียนรถ", "ประเภทรถ", "ประเภทรถอื่นๆ",
            "วันที่บริการสำเร็จ", "เวลาบริการสำเร็จ"
        ]


        const data = t1

        // console.log(data)

        const values = data.map(item => Object.values(item));

        const allValues = [header, ...values];

        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range,
          });

        // เขียนข้อมูลลง Google Sheets
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range,
            valueInputOption: "RAW",
            resource: {
                values: allValues,
            },
        });

        res.status(200).json({ message: "Data written to Google Sheets!" });
    });
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post("/api/test", verifyToken, jsonParser, async (req, res) => { 

    try {

        const client = await auth.getClient();
        const sheets = google.sheets({ version: "v4", auth: client });

        const spreadsheetId = "1xsTW3SDuwtVdOoSlAIv6YCrnkZ17VDISnNYzjCOoNZ4"; // ใส่ Spreadsheet ID
        const range = "sheet1"; // ระบุช่วงที่ต้องการอ่าน

        const response = await sheets.spreadsheets.values.append({
          spreadsheetId,
          range,
          valueInputOption: "RAW",
          resource: { values: [["Hello", "World"]] },
        });
      
        console.log("✅ Data written successfully:", response.data);
        res.status(200).json("✅ Data written successfully");
      } catch (error) {
        if (error.response) {
          console.error("🔥 Google API Error:", error.response.data.error);
          res.status(400).json("❌ Unexpected Error");
        } else {
          console.error("❌ Unexpected Error:", error.message);
          res.status(400).json("❌ Unexpected Error");
        }
      }

})


const port = process.env.PORT || 3001
app.listen(port, () => {
    console.log("API Start on port: " + port)
})
