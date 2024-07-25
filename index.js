require("dotenv").config();
var data = require('./data/Add.json');
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bodyParser = require('body-parser')
const jsonParser = bodyParser.json();
const xl = require('excel4node');

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

app.get("/form2/users/:us", jsonParser, (req, res, next) => {
    const us = req.params.us
    conn2.query("SELECT * FROM formcom WHERE hos_id = ? AND fm_ac = 1 ORDER BY status ASC, dateres ASC", [us], (err, t1) => {
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
    var Isql = "INSERT INTO `carsmanage` (`us_id`, `fm_id`, `distance`, `c_start`, `c_end`, `cm_status`, `cm_date`, `des`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    var IV = [req.body.us_id, req.body.fm_id, req.body.distance, req.body.cstart, req.body.cend, req.body.cm_status, req.body.cm_date, req.body.des]
    conn2.execute(Isql, IV, (err, results, fields) => {
        if (err) {
            res.json({ status: 'error', massage: err })
            //return
        } else
            res.json({ status: 'ok' })
    })
})

app.put("/statu2/edit/:id", jsonParser, (req, res, next) => {
    const id = req.params.id
    const sql = "UPDATE `carsmanage` SET distance = ?, c_start = ?, c_end = ? WHERE `carsmanage`.`cm_id` = ?";
    conn2.execute(sql, [req.body.dis, req.body.cs, req.body.ce, id], (err, ev, fields) => {
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
            ws.cell(1, 13).string("การเห็น");
            ws.cell(1, 14).string("การได้ยินหรือสื่อความหมาย");
            ws.cell(1, 15).string("การเคลื่อนไหวหรือทางร่างกาย");
            ws.cell(1, 16).string("จิตใจหรือพฤติกรรม");
            ws.cell(1, 17).string("สติปัญญา");
            ws.cell(1, 18).string("การเรียนรู้");
            ws.cell(1, 19).string("ออทิสติก");
            ws.cell(1, 20).string("ADL 5-12");
            ws.cell(1, 21).string("มีปัญหาด้านการเคลื่อนไหว");
            ws.cell(1, 22).string("มีนัดรักษาต่อเนื่องกับโรงพยาบาล");
            ws.cell(1, 23).string("มีปัญหาด้านเศรษฐานะ");
            ws.cell(1, 24).string("อื่น ๆ ระบุ");
            ws.cell(1, 25).string("เงื่อนไขระบุ");
            ws.cell(1, 26).string("ไม่เข้าเงื่อนไขระบุ");
            ws.cell(1, 27).string("บ้านเลขที่");
            ws.cell(1, 28).string("ถนน");
            ws.cell(1, 29).string("แขวง");
            ws.cell(1, 30).string("เขต");
            ws.cell(1, 31).string("จังหวัด");
            ws.cell(1, 32).string("รหัสไปรษณี");
            ws.cell(1, 33).string("เบอร์โทรศัพท์");
            ws.cell(1, 34).string("วันที่ขอรถ");
            ws.cell(1, 35).string("เวลาที่ขอรถ");
            ws.cell(1, 36).string("วิธีการ");
            ws.cell(1, 37).string("สถานที่ต้นทาง");
            ws.cell(1, 38).string("เลขที่ต้นทาง");
            ws.cell(1, 39).string("ถนนต้นทาง");
            ws.cell(1, 40).string("แขวงต้นทาง");
            ws.cell(1, 41).string("เขตต้นทาง");
            ws.cell(1, 42).string("จังหวัดต้นทาง");
            ws.cell(1, 43).string("รหัสไปรษณีต้นทาง");
            ws.cell(1, 44).string("สถานที่ปลายทาง");
            ws.cell(1, 45).string("เลขที่ปลายทาง");
            ws.cell(1, 46).string("ถนนปลายทาง");
            ws.cell(1, 47).string("แขวงปลายทาง");
            ws.cell(1, 48).string("เขตปลายทาง");
            ws.cell(1, 49).string("จังหวัดปลายทาง");
            ws.cell(1, 50).string("รหัสไปรษณีปลายทาง");
            ws.cell(1, 51).string("วันส่งข้อมูล");
            ws.cell(1, 52).string("เวลาส่งข้อมูล");
            ws.cell(1, 53).string("ชื่อผู้บันทึก");
            ws.cell(1, 54).string("สรุปผลการให้บริการ");
            ws.cell(1, 55).string("ระยะทาง(กม.)");
            ws.cell(1, 56).string("เวลาไป");
            ws.cell(1, 57).string("เวลากลับ");
            ws.cell(1, 58).string("สถานะ");
            ws.cell(1, 59).string("หมายเหตุยกเลิก");
            ws.cell(1, 60).string("ยกเลิกระบุ");
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
                    for (var j = 0; j <= 13; j++) {
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
                    date = `${t.fm_time.getDate()}/${t.fm_time.getMonth() + 1}/${t.fm_time.getFullYear()+543}`
                    time = `${t.fm_time.getHours()}:${t.fm_time.getMinutes()}:${t.fm_time.getSeconds()}`
                }
                if (t.distance === null) {
                    t.distance = 0
                }
                // if (t.met_name === "-") {
                //     t.met_name = "ไม่เข้าเงื่อนไขการขอใช้รถ"
                // }
                if (t.status === null) {
                    t.status = "รอดำเนินการ"
                    if(t.ac_detail !== "เข้าเงื่อนไขการขอใช้รถ"){
                        t.status = "แนะนำบริการอื่น"
                    }
                }
                if (t.status === 1) {
                    t.status = "ดำเนินการสำเร็จ"
                }
                if (t.status === 0) {
                    t.status = "ยกเลิก"
                }
                if(t.des === null) {
                    des = ""
                } else if(t.des === "ยกเลิกนัด รถไม่พร้อม") {
                    des = "รถไม่พร้อม"
                } else if(t.des === "ยกเลิกนัด รถไม่เพียงพอ") {
                    des = "รถไม่เพียงพอ"
                } else if(t.des === "ผู้ป่วยยกเลิกนัด") {
                    des = "ผู้ป่วยยกเลิกนัด"
                } else if(t.des === "") {
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
                ws.cell(i + 2, 4).string(`${t.date.getDate()}/${t.date.getMonth() + 1}/${t.date.getFullYear()+543}`);
                ws.cell(i + 2, 5).string(`${t.date.getHours()}:${t.date.getMinutes()}:${t.date.getSeconds()}`);
                ws.cell(i + 2, 6).string(t.citizen);
                ws.cell(i + 2, 7).string(t.pre_name);
                ws.cell(i + 2, 8).string(t.fname);
                ws.cell(i + 2, 9).string(t.lname);
                ws.cell(i + 2, 10).number(t.age);
                ws.cell(i + 2, 11).number(condition[0]);
                ws.cell(i + 2, 12).number(condition[6]);
                ws.cell(i + 2, 13).number(condition[7]);
                ws.cell(i + 2, 14).number(condition[8]);
                ws.cell(i + 2, 15).number(condition[9]);
                ws.cell(i + 2, 16).number(condition[10]);
                ws.cell(i + 2, 17).number(condition[11]);
                ws.cell(i + 2, 18).number(condition[12]);
                ws.cell(i + 2, 19).number(condition[13]);
                ws.cell(i + 2, 20).number(condition[1]);
                ws.cell(i + 2, 21).number(condition[2]);
                ws.cell(i + 2, 22).number(condition[3]);
                ws.cell(i + 2, 23).number(condition[4]);
                ws.cell(i + 2, 24).number(condition[5]);
                ws.cell(i + 2, 25).string(condn);
                ws.cell(i + 2, 26).string(dispass);
                ws.cell(i + 2, 27).string(t.house);
                ws.cell(i + 2, 28).string(t.street);
                ws.cell(i + 2, 29).string(t.subdis);
                ws.cell(i + 2, 30).string(t.district01);
                ws.cell(i + 2, 31).string(t.province);
                ws.cell(i + 2, 32).string(t.zipcode);
                ws.cell(i + 2, 33).string(t.call);
                ws.cell(i + 2, 34).string(`${t.dateres.getDate()}/${t.dateres.getMonth() + 1}/${t.dateres.getFullYear()+543}`);
                ws.cell(i + 2, 35).string(`${t.dateres.getHours()}:${t.dateres.getMinutes()}:${t.dateres.getSeconds()}`);
                ws.cell(i + 2, 36).string(t.met_name);
                ws.cell(i + 2, 37).string(start[0]);
                ws.cell(i + 2, 38).string(start[1]);
                ws.cell(i + 2, 39).string(start[2]);
                ws.cell(i + 2, 40).string(start[3]);
                ws.cell(i + 2, 41).string(start[4]);
                ws.cell(i + 2, 42).string(start[5]);
                ws.cell(i + 2, 43).string(start[6]);
                ws.cell(i + 2, 44).string(end[0]);
                ws.cell(i + 2, 45).string(end[1]);
                ws.cell(i + 2, 46).string(end[2]);
                ws.cell(i + 2, 47).string(end[3]);
                ws.cell(i + 2, 48).string(end[4]);
                ws.cell(i + 2, 49).string(end[5]);
                ws.cell(i + 2, 50).string(end[7]);
                ws.cell(i + 2, 51).string(date);
                ws.cell(i + 2, 52).string(time);
                ws.cell(i + 2, 53).string(t.editer);
                ws.cell(i + 2, 54).string(t.ac_detail);
                ws.cell(i + 2, 55).number(t.distance);
                ws.cell(i + 2, 56).string(t.c_start);
                ws.cell(i + 2, 57).string(t.c_end);
                ws.cell(i + 2, 58).string(String(t.status));
                ws.cell(i + 2, 59).string(des);
                ws.cell(i + 2, 60).string(deca);
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

    const formattedDate = `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year+543}`;

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
            ws.cell(1, 13).string("การเห็น");
            ws.cell(1, 14).string("การได้ยินหรือสื่อความหมาย");
            ws.cell(1, 15).string("การเคลื่อนไหวหรือทางร่างกาย");
            ws.cell(1, 16).string("จิตใจหรือพฤติกรรม");
            ws.cell(1, 17).string("สติปัญญา");
            ws.cell(1, 18).string("การเรียนรู้");
            ws.cell(1, 19).string("ออทิสติก");
            ws.cell(1, 20).string("ADL 5-12");
            ws.cell(1, 21).string("มีปัญหาด้านการเคลื่อนไหว");
            ws.cell(1, 22).string("มีนัดรักษาต่อเนื่องกับโรงพยาบาล");
            ws.cell(1, 23).string("มีปัญหาด้านเศรษฐานะ");
            ws.cell(1, 24).string("อื่น ๆ ระบุ");
            ws.cell(1, 25).string("เงื่อนไขระบุ");
            ws.cell(1, 26).string("ไม่เข้าเงื่อนไขระบุ");
            ws.cell(1, 27).string("บ้านเลขที่");
            ws.cell(1, 28).string("ถนน");
            ws.cell(1, 29).string("แขวง");
            ws.cell(1, 30).string("เขต");
            ws.cell(1, 31).string("จังหวัด");
            ws.cell(1, 32).string("รหัสไปรษณี");
            ws.cell(1, 33).string("เบอร์โทรศัพท์");
            ws.cell(1, 34).string("วันที่ขอรถ");
            ws.cell(1, 35).string("เวลาที่ขอรถ");
            ws.cell(1, 36).string("วิธีการ");
            ws.cell(1, 37).string("สถานที่ต้นทาง");
            ws.cell(1, 38).string("เลขที่ต้นทาง");
            ws.cell(1, 39).string("ถนนต้นทาง");
            ws.cell(1, 40).string("แขวงต้นทาง");
            ws.cell(1, 41).string("เขตต้นทาง");
            ws.cell(1, 42).string("จังหวัดต้นทาง");
            ws.cell(1, 43).string("รหัสไปรษณีต้นทาง");
            ws.cell(1, 44).string("สถานที่ปลายทาง");
            ws.cell(1, 45).string("เลขที่ปลายทาง");
            ws.cell(1, 46).string("ถนนปลายทาง");
            ws.cell(1, 47).string("แขวงปลายทาง");
            ws.cell(1, 48).string("เขตปลายทาง");
            ws.cell(1, 49).string("จังหวัดปลายทาง");
            ws.cell(1, 50).string("รหัสไปรษณีปลายทาง");
            ws.cell(1, 51).string("วันส่งข้อมูล");
            ws.cell(1, 52).string("เวลาส่งข้อมูล");
            ws.cell(1, 53).string("ชื่อผู้บันทึก");
            ws.cell(1, 54).string("สรุปผลการให้บริการ");
            ws.cell(1, 55).string("ระยะทาง(กม.)");
            ws.cell(1, 56).string("เวลาไป");
            ws.cell(1, 57).string("เวลากลับ");
            ws.cell(1, 58).string("สถานะ");
            ws.cell(1, 59).string("หมายเหตุยกเลิก");
            ws.cell(1, 60).string("ยกเลิกระบุ");

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
                    for (var j = 0; j <= 13; j++) {
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
                    date = `${t.fm_time.getDate()}/${t.fm_time.getMonth() + 1}/${t.fm_time.getFullYear()+543}`
                    time = `${t.fm_time.getHours()}:${t.fm_time.getMinutes()}:${t.fm_time.getSeconds()+543}`
                }
                if (t.distance === null) {
                    t.distance = 0
                }
                // if (t.met_name === "-") {
                //     t.met_name = "ไม่เข้าเงื่อนไขการขอใช้รถ"
                // }
                if (t.status === null) {
                    t.status = "รอดำเนินการ"
                    if(t.ac_detail !== "เข้าเงื่อนไขการขอใช้รถ"){
                        t.status = "แนะนำบริการอื่น"
                    }
                }
                if (t.status === 1) {
                    t.status = "ดำเนินการสำเร็จ"
                }
                if (t.status === 0) {
                    t.status = "ยกเลิก"
                }
                if(t.des === null) {
                    des = ""
                } else if(t.des === "ยกเลิกนัด รถไม่พร้อม") {
                    des = "รถไม่พร้อม"
                } else if(t.des === "ยกเลิกนัด รถไม่เพียงพอ") {
                    des = "รถไม่เพียงพอ"
                } else if(t.des === "ผู้ป่วยยกเลิกนัด") {
                    des = "ผู้ป่วยยกเลิกนัด"
                } else if(t.des === "") {
                    des = ""
                }
                 else {
                    deca = t.des
                    des = "อื่นๆ"
                }

                ws.cell(i + 2, 1).number(t.fm_id);
                ws.cell(i + 2, 2).string(t.hos_name);
                ws.cell(i + 2, 3).string(t.way);
                ws.cell(i + 2, 4).string(`${t.date.getDate()}/${t.date.getMonth() + 1}/${t.date.getFullYear()+543}`);
                ws.cell(i + 2, 5).string(`${t.date.getHours()}:${t.date.getMinutes()}:${t.date.getSeconds()}`);
                ws.cell(i + 2, 6).string(t.citizen);
                ws.cell(i + 2, 7).string(t.pre_name);
                ws.cell(i + 2, 8).string(t.fname);
                ws.cell(i + 2, 9).string(t.lname);
                ws.cell(i + 2, 10).number(t.age);
                ws.cell(i + 2, 11).number(condition[0]);
                ws.cell(i + 2, 12).number(condition[6]);
                ws.cell(i + 2, 13).number(condition[7]);
                ws.cell(i + 2, 14).number(condition[8]);
                ws.cell(i + 2, 15).number(condition[9]);
                ws.cell(i + 2, 16).number(condition[10]);
                ws.cell(i + 2, 17).number(condition[11]);
                ws.cell(i + 2, 18).number(condition[12]);
                ws.cell(i + 2, 19).number(condition[13]);
                ws.cell(i + 2, 20).number(condition[1]);
                ws.cell(i + 2, 21).number(condition[2]);
                ws.cell(i + 2, 22).number(condition[3]);
                ws.cell(i + 2, 23).number(condition[4]);
                ws.cell(i + 2, 24).number(condition[5]);
                ws.cell(i + 2, 25).string(condn);
                ws.cell(i + 2, 26).string(dispass);
                ws.cell(i + 2, 27).string(t.house);
                ws.cell(i + 2, 28).string(t.street);
                ws.cell(i + 2, 29).string(t.subdis);
                ws.cell(i + 2, 30).string(t.district01);
                ws.cell(i + 2, 31).string(t.province);
                ws.cell(i + 2, 32).string(t.zipcode);
                ws.cell(i + 2, 33).string(t.call);
                ws.cell(i + 2, 34).string(`${t.dateres.getDate()}/${t.dateres.getMonth() + 1}/${t.dateres.getFullYear()+543}`);
                ws.cell(i + 2, 35).string(`${t.dateres.getHours()}:${t.dateres.getMinutes()}:${t.dateres.getSeconds()}`);
                ws.cell(i + 2, 36).string(t.met_name);
                ws.cell(i + 2, 37).string(start[0]);
                ws.cell(i + 2, 38).string(start[1]);
                ws.cell(i + 2, 39).string(start[2]);
                ws.cell(i + 2, 40).string(start[3]);
                ws.cell(i + 2, 41).string(start[4]);
                ws.cell(i + 2, 42).string(start[5]);
                ws.cell(i + 2, 43).string(start[6]);
                ws.cell(i + 2, 44).string(end[0]);
                ws.cell(i + 2, 45).string(end[1]);
                ws.cell(i + 2, 46).string(end[2]);
                ws.cell(i + 2, 47).string(end[3]);
                ws.cell(i + 2, 48).string(end[4]);
                ws.cell(i + 2, 49).string(end[5]);
                ws.cell(i + 2, 50).string(end[7]);
                ws.cell(i + 2, 51).string(date);
                ws.cell(i + 2, 52).string(time);
                ws.cell(i + 2, 53).string(t.editer);
                ws.cell(i + 2, 54).string(t.ac_detail);
                ws.cell(i + 2, 55).number(t.distance);
                ws.cell(i + 2, 56).string(t.c_start);
                ws.cell(i + 2, 57).string(t.c_end);
                ws.cell(i + 2, 58).string(String(t.status));
                ws.cell(i + 2, 59).string(des);
                ws.cell(i + 2, 60).string(deca);
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


const port = process.env.PORT || 3001
app.listen(port, () => {
    console.log("API Start on port: " + port)
})
