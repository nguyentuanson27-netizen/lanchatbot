import {describe,it,expect} from "vitest";
import {checkoutDetails} from "./realtime-sales-cycle.js";
import {paymentChoice} from "./checkout-payment-choice.js";
describe("closed candidate payment choice",()=>{
 it.each(["Chị trả COD nhé.","Em trả CK nhé"])("retains the affirmative payment verb used by existing checkout: %s",text=>expect(paymentChoice(text)).toEqual({kind:"RESOLVED",method:text.includes("COD")?"COD":"BANK_TRANSFER"}));
 it.each(["Chị muốn trả khi nhận hàng.","Em chọn COD nhé","Trả tiền khi nhận hàng","Thanh toán: tiền mặt","Tôi thanh toán khi nhận hàng"])("captures only affirmative COD: %s",text=>expect(paymentChoice(text)).toEqual({kind:"RESOLVED",method:"COD"}));
 it.each(["Chị chuyển khoản nhé","Em chọn CK","Thanh toán: chuyển khoản","Tôi muốn thanh toán chuyển khoản"])("captures transfer: %s",text=>expect(paymentChoice(text)).toEqual({kind:"RESOLVED",method:"BANK_TRANSFER"}));
 it.each(["không COD","chưa chọn","COD được không?","nếu COD thì sao","COD hay chuyển khoản","không chuyển khoản","Chị trả khi nhận hàng nhưng chưa chốt","Thanh toán: COD\nThanh toán: CK","Thanh toán: COD\nKhông COD","COD\nchuyển khoản"])("does not infer unresolved: %s",text=>expect(paymentChoice(text).kind).not.toBe("RESOLVED"));
 it("leaves unrelated private fields alone and never uses model fallback in candidate mode",()=>{
  expect(paymentChoice("Nguyễn Thị Lan")).toEqual({kind:"NO_SIGNAL"});
  expect(checkoutDetails("COD",undefined,"FULL_NAME","SINGLE_FIELD")).toEqual({paymentMethod:"COD"});
  expect(checkoutDetails("Tên: Lan\nSĐT: 0900000000\nThanh toán: Chị muốn trả khi nhận hàng",undefined,undefined,"SINGLE_FIELD")).toMatchObject({fullName:"Lan",phone:"0900000000",paymentMethod:"COD"});
  expect(checkoutDetails("không COD",undefined,undefined,"SINGLE_FIELD").paymentMethod).toBeUndefined();
  expect(checkoutDetails("không COD",undefined).paymentMethod).toBe("COD"); // unchanged legacy behavior
 });
});
