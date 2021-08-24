const functions = require("firebase-functions");
const admin = require('firebase-admin');
const axios = require('axios')
admin.initializeApp()
var moment = require('moment-timezone');

const LINE_MESSAGING_API = "https://api.line.me/v2/bot"
const LINE_HEADER = {
  'Content-Type': 'application/json',
  Authorization: 'Bearer 7n1EeOL33PXx9cxP6QxH8boqVp27V5XK9MExHdcQd0DFI9LkvwdzkxYovUvKDXdeCxz4A2Hn1KrhTg1DokgeWSnrYcRqANqQV32H8wpqt8u/L/8rJLq1PNLzoiBQLa1Ovuu3bLd2sMCaKFhzzBGGOgdB04t89/1O/w1cDnyilFU='
}

exports.creatOrder = functions.firestore
  .document('oders/{docId}')
  .onCreate((doc, context) => {
    return new Promise(resolve => {
      broadcast(doc.data())
      resolve()
    })
  })


const broadcast = (data) => {
  var fPrice = formatPrice(data.totalAll)
  var fPay = formatDate(data.payon)
  return axios({
    method: 'post',
    url: `${LINE_MESSAGING_API}/message/broadcast`,
    headers: LINE_HEADER,
    data: JSON.stringify({
      messages: [{ type: "text", text: "มีการชำระออเดอร์เข้ามาใหม่ \uDBC0\uDC78 \n หมายเลขออเดอร์ : " + data.orderID + "\n จากคุณ : " + data.name + "\n จำนวนสินค้า : " + data.totalItem + " รายการ" + "\n ราคาทั้งหมด : " + fPrice + " บาท" + "\n ยืนยันการชำระเมื่อ : " + fPay + "\n หลักฐานการชำระ : " },
      {
        type: "image",
        originalContentUrl: data.slip,
        previewImageUrl: data.slip
      }
      ]
    })
  })
}

formatPrice = (value) => {
  let val = (value / 1).toFixed(0);
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

formatDate = (date) => {
  var time = date.toDate();
  var formatTimeShow = moment(time).tz('Asia/Bangkok').format("DD/MM/YYYY HH:mm");
  return formatTimeShow;
},

  exports.updateAccess = functions.firestore
    .document('users/{userId}')
    .onCreate((doc, context) => {

      const newValue = doc.data();
      const signInWith = newValue.signinWith
      var dashboardRef = admin.firestore().doc('dashboard/yp6p65oDdQPdj4eiSYtS')
      dashboardRef.get().then(querySnapshot => {
        var signData = querySnapshot.data().signInWith
        if (signInWith == 'email') {
          var updateEmail = signData.email + 1
          var setDataEmail = {
            signInWith: {
              email: updateEmail,
              google: signData.google,
              facebook: signData.facebook
            }
          }
          dashboardRef.update(setDataEmail)
        } else if (signInWith == 'google') {
          updateDataGoogle = signData.google + 1
          var setDataGoogle = {
            signInWith: {
              email: signData.email,
              google: updateDataGoogle,
              facebook: signData.facebook
            }
          }
          dashboardRef.update(setDataGoogle)
        } else if (signInWith == 'facebook') {
          updateDataFacebook = signData.facebook + 1

          var setDataFacebook = {
            signInWith: {
              email: signData.email,
              google: signData.google,
              facebook: updateDataFacebook
            }
          }
          dashboardRef.update(setDataFacebook)
        }
      })

      const customClaims = {
        role: newValue.role
      };

      // เพื่ม role เมื่อมี user ใหม่
      return admin.auth().setCustomUserClaims(
        context.params.userId, customClaims)
        .then(() => {
          console.log("Done!")
        })
        .catch(error => {
          console.log(error);
        });

    });

exports.createComment = functions.firestore
  .document('comments/{docId}')
  .onCreate((doc, context) => {
    const productID = doc.data().productIdRef;
    const rating = doc.data().rating;
    var productRef = admin.firestore().doc('products/' + productID)

    return productRef.get().then(doc => {
      var proRating = doc.data().rating
      var proRatingCount = doc.data().ratingCount

      var newRating = proRating + rating
      var newRatingCount = proRatingCount + 1
      var setData = {
        rating: newRating,
        ratingCount: newRatingCount,
        ratingSearch : parseInt(newRating/newRatingCount)
      }

      return productRef.update(setData)
    }).catch(err => {
      console.log(err);
    })
  })


exports.updateIncome = functions.firestore
  .document('incomes/{docId}')
  .onCreate((doc, context) => {

    const price = doc.data().price;
    const cashStatus = doc.data().status

    var incomeRef = admin.firestore().doc('dashboard/yp6p65oDdQPdj4eiSYtS')
    return incomeRef.get().then(doc => {
      var oleIncome = doc.data().income

      if (cashStatus == 'cash-in') {
        var newIncome = oleIncome + price
      } else if (cashStatus == 'cash-out') {
        newIncome = oleIncome - price
      }

      var setData = {
        income: newIncome,
      }

      return incomeRef.update(setData)
    }).catch(err => {
      console.log(err);
    })
  })

exports.incomeOnUpdate = functions.firestore
  .document('incomes/{docId}')
  .onUpdate((change, context) => {

    const oldPrice = change.before.data().price;
    const newPrice = change.after.data().price;

    var incomeRef = admin.firestore().doc('dashboard/yp6p65oDdQPdj4eiSYtS')
    return incomeRef.get().then(doc => {
      var oleIncome = doc.data().income

      var newIncome = oleIncome - oldPrice
      var newUpdateIncome = newIncome + newPrice
      var setData = {
        income: newUpdateIncome,
      }

      return incomeRef.update(setData)
    }).catch(err => {
      console.log(err);
    })
  })


exports.updateComment = functions.firestore
  .document('comments/{docId}')
  .onUpdate((change, context) => {
    const productID = change.before.data().productIdRef;

    const previousRating = change.before.data().rating;
    const newRating = change.after.data().rating;

    var productRef = admin.firestore().doc('products/' + productID)
    var newDataRating
    if (previousRating > newRating) {
      newDataRating = previousRating - newRating

      return productRef.get().then(doc => {
        var proRating = doc.data().rating
        var proRatingCount = doc.data().ratingCount
        var newRatingRef = proRating - newDataRating

        var setData = {
          rating: newRatingRef,
          ratingSearch : parseInt(newRatingRef/proRatingCount)
        }

        return productRef.update(setData)
      }).catch(err => {
        console.log(err);
      })
    } else if (previousRating < newRating) {
      newDataRating = newRating - previousRating

      return productRef.get().then(doc => {
        var proRating = doc.data().rating
        var proRatingCount = doc.data().ratingCount
        var newRatingRef = proRating + newDataRating

        var setData = {
          rating: newRatingRef,
          ratingSearch : parseInt(newRatingRef/proRatingCount)
        }

        return productRef.update(setData)
      }).catch(err => {
        console.log(err);
      })
    } else {
      return
    }
  })