require("dotenv").config();
var data = require('./data/Add.json');
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bodyParser = require('body-parser')
const jsonParser = bodyParser.json();
const xl = require('excel4node');

const app = express();
const conn2 = mysql.createConnection({
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
    var Isql = "INSERT INTO `form` (`hos_id`, `date`, `citizen`, `pre_id`, `fname`, `lname`, `age`, `house`, `street`, `dis_id`, `subdis`, `zipcode`, `call`, `dateres`, `met_id`, `start`, `end`, `condition`, `editer` ,`fm_time`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    var IV = [req.body.hos, req.body.date, req.body.sitizen, req.body.preflix, req.body.fname, req.body.lname, req.body.age, req.body.num, req.body.streed, req.body.district, req.body.subdistrict, req.body.zip, req.body.call, req.body.dateres, req.body.met, req.body.start, req.body.end, req.body.condition, req.body.editer, req.body.time]
    conn2.execute(Isql, IV, (err, results, fields) => {
        if (err) {
            res.json({ status: 'error', massage: err })
            //return
        } else
            res.json({ status: 'ok' })
    })
})

app.get("/form2", jsonParser, (req, res, next) => {
    conn2.query("SELECT * FROM formcom ORDER BY status ASC, dateres ASC", (err, t1) => {
        t1 = t1.map(d => {
            if (d.date != null)
                d.date = "วันที่ " + d.date.toISOString().split('T')[0] + " เวลา " + (d.date.toISOString().split('T')[1]).split(".")[0] + " น.";
            if (d.dateres != null)
                d.dateres = " วันที่ " + d.dateres.toISOString().split('T')[0] + " เวลา " + (d.dateres.toISOString().split('T')[1]).split(".")[0] + " น.";
            return d;
        })
        res.send(t1)
    })
})

app.get("/form2/users/:us", jsonParser, (req, res, next) => {
    const us = req.params.us
    conn2.query("SELECT * FROM formcom WHERE hos_id = ? ORDER BY status ASC, dateres ASC", [us], (err, t1) => {
        t1 = t1.map(d => {
            if (d.date != null)
                d.date = "วันที่ " + d.date.toISOString().split('T')[0] + " เวลา " + (d.date.toISOString().split('T')[1]).split(".")[0] + " น.";
            if (d.dateres != null)
                d.dateres = " วันที่ " + d.dateres.toISOString().split('T')[0] + " เวลา " + (d.dateres.toISOString().split('T')[1]).split(".")[0] + " น.";
            return d;
        })
        res.send(t1)
    })
})

app.get("/form2/:id", jsonParser, (req, res, next) => {
    const id = req.params.id
    conn2.query("SELECT * FROM formcom WHERE formcom.fm_id = ?", [id], (err, t1) => {
        res.send(t1)
    })
})

app.post('/status2', jsonParser, (req, res, next) => {
    var Isql = "INSERT INTO `carsmanage` (`us_id`, `fm_id`, `cm_status`, `cm_date`, `des`) VALUES (?, ?, ?, ?, ?)"
    var IV = [req.body.us_id, req.body.fm_id, req.body.cm_status, req.body.cm_date, req.body.des]
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
    const d = new Date()
    var t = d.getFullYear() + "/" + d.getMonth() + "/" + d.getDate() + " " + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds()
    const sql = "UPDATE `carsmanage` SET `cm_status` = '0', `cm_date` = ?, `des` = '?' WHERE `carsmanage`.`cm_id` = ?";
    conn2.execute(sql, [t, req.body.des, id], (err, ev, fields) => {
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
            ws.cell(1, 3).string("วันที่จอง");
            ws.cell(1, 4).string("เวลาที่จอง");
            ws.cell(1, 5).string("เลขบัตรประชาชน");
            ws.cell(1, 6).string("คำนำหน้าชื่อ");
            ws.cell(1, 7).string("ชื่อ");
            ws.cell(1, 8).string("นามสกุล");
            ws.cell(1, 9).string("อายุ(ปี)");
            ws.cell(1, 10).string("บ้านเลขที่");
            ws.cell(1, 11).string("ถนน");
            ws.cell(1, 12).string("แขวง");
            ws.cell(1, 13).string("เขต");
            ws.cell(1, 14).string("รหัสไปรษณี");
            ws.cell(1, 15).string("เบอร์โทรศัพท์");
            ws.cell(1, 16).string("วันที่ขอรถ");
            ws.cell(1, 17).string("เวลาที่ขอรถ");
            ws.cell(1, 18).string("วิธีการ");
            ws.cell(1, 19).string("สถานที่ต้นทาง");
            ws.cell(1, 20).string("เลขที่ต้นทาง");
            ws.cell(1, 21).string("ถนนต้นทาง");
            ws.cell(1, 22).string("แขวงต้นทาง");
            ws.cell(1, 23).string("เขตต้นทาง");
            ws.cell(1, 24).string("รหัสไปรษณีต้นทาง");
            ws.cell(1, 25).string("สถานที่ปลายทาง");
            ws.cell(1, 26).string("เลขที่ปลายทาง");
            ws.cell(1, 27).string("ถนนปลายทาง");
            ws.cell(1, 28).string("แขวงปลายทาง");
            ws.cell(1, 29).string("เขตปลายทาง");
            ws.cell(1, 30).string("รหัสไปรษณีปลายทาง");
            ws.cell(1, 31).string("ผู้สูงอายุ");
            ws.cell(1, 32).string("ADL 5-12");
            ws.cell(1, 33).string("มีปัญหาด้านการเคลื่อนไหว");
            ws.cell(1, 34).string("มีนัดรักษาต่อเนื่องกับโรงพยาบาล");
            ws.cell(1, 35).string("มีปัญหาด้านเศรษฐานะ");
            ws.cell(1, 36).string("อื่น ๆ ระบุ");
            ws.cell(1, 37).string("คนพิการ");
            ws.cell(1, 38).string("การเห็น");
            ws.cell(1, 39).string("การได้ยินหรือสื่อความหมาย");
            ws.cell(1, 40).string("การเคลื่อนไหวหรือทางร่างกาย");
            ws.cell(1, 41).string("จิตใจหรือพฤติกรรม");
            ws.cell(1, 42).string("สติปัญญา");
            ws.cell(1, 43).string("การเรียนรู้");
            ws.cell(1, 44).string("ออทิสติก");
            ws.cell(1, 45).string("ชื่อผู้บันทึก");
            ws.cell(1, 46).string("สถานะ");
            ws.cell(1, 47).string("วันส่งข้อมูล");
            ws.cell(1, 48).string("เวลาส่งข้อมูล");
            ws.cell(1, 49).string("หมายเหตุ");

            t1.map((t, i) => {

                var start
                var end
                var condition
                var condn
                var time
                var date

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
                        else
                            condition[j] = 1
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
                    date = `${t.fm_time.getDate()}/${t.fm_time.getMonth() + 1}/${t.fm_time.getFullYear()}`
                    time = `${t.fm_time.getHours()}:${t.fm_time.getMinutes()}:${t.fm_time.getSeconds()}`
                }

                ws.cell(i + 2, 1).number(t.fm_id);
                ws.cell(i + 2, 2).string(t.hos_name);
                ws.cell(i + 2, 3).string(`${t.date.getDate()}/${t.date.getMonth() + 1}/${t.date.getFullYear()}`);
                ws.cell(i + 2, 4).string(`${t.date.getHours()}:${t.date.getMinutes()}:${t.date.getSeconds()}`);
                ws.cell(i + 2, 5).string(t.citizen);
                ws.cell(i + 2, 6).string(t.pre_name);
                ws.cell(i + 2, 7).string(t.fname);
                ws.cell(i + 2, 8).string(t.lname);
                ws.cell(i + 2, 9).number(t.age);
                ws.cell(i + 2, 10).string(t.house);
                ws.cell(i + 2, 11).string(t.street);
                ws.cell(i + 2, 12).string(t.subdis);
                ws.cell(i + 2, 13).string(String(t.dis_name));
                ws.cell(i + 2, 14).string(t.zipcode);
                ws.cell(i + 2, 15).string(t.call);
                ws.cell(i + 2, 16).string(`${t.dateres.getDate()}/${t.dateres.getMonth() + 1}/${t.dateres.getFullYear()}`);
                ws.cell(i + 2, 17).string(`${t.dateres.getHours()}:${t.dateres.getMinutes()}:${t.dateres.getSeconds()}`);
                ws.cell(i + 2, 18).string(t.met_name);
                ws.cell(i + 2, 19).string(start[0]);
                ws.cell(i + 2, 20).string(start[1]);
                ws.cell(i + 2, 21).string(start[2]);
                ws.cell(i + 2, 22).string(start[3]);
                ws.cell(i + 2, 23).string(start[4]);
                ws.cell(i + 2, 24).string(start[6]);
                ws.cell(i + 2, 25).string(end[0]);
                ws.cell(i + 2, 26).string(end[1]);
                ws.cell(i + 2, 27).string(end[2]);
                ws.cell(i + 2, 28).string(end[3]);
                ws.cell(i + 2, 29).string(end[4]);
                ws.cell(i + 2, 30).string(end[7]);
                ws.cell(i + 2, 31).number(condition[0]);
                ws.cell(i + 2, 32).number(condition[1]);
                ws.cell(i + 2, 33).number(condition[2]);
                ws.cell(i + 2, 34).number(condition[3]);
                ws.cell(i + 2, 35).number(condition[4]);
                ws.cell(i + 2, 36).number(condition[5]);
                ws.cell(i + 2, 37).number(condition[6]);
                ws.cell(i + 2, 38).number(condition[7]);
                ws.cell(i + 2, 39).number(condition[8]);
                ws.cell(i + 2, 40).number(condition[9]);
                ws.cell(i + 2, 41).number(condition[10]);
                ws.cell(i + 2, 42).number(condition[11]);
                ws.cell(i + 2, 43).number(condition[12]);
                ws.cell(i + 2, 44).number(condition[13]);
                ws.cell(i + 2, 45).string(t.editer);
                ws.cell(i + 2, 46).string(String(t.status));
                ws.cell(i + 2, 47).string(date);
                ws.cell(i + 2, 48).string(time);
                ws.cell(i + 2, 49).string(t.des);

            }
            )
            wb.write('ExcelFile.xlsx', res);
        }
    }
    )

})

const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log("API Start on port: " + port)
})
