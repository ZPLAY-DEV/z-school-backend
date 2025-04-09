//? ✅ 카카오 알림톡

//? ------------------------------------------------------------------------ ?//
//? 배송시작
//? ------------------------------------------------------------------------ ?//

export const getTemplateOfTrackingNumber = (
  phone: string,
  orderName: string,
  courier: string,
  trackingNumber: string,
  // orderId: string,
) => {
  return {
    phone: phone,
    code: 'TrackingNumber250207',
    body: `[와코] 택배송장 등록안내

와코에서 구매하신 상품의 택배사와 송장번호가 등록되었습니다. 통상적으로, 익일 택배배송이 시작되고 익일+1일 후 배송이 완료됩니다. (기상악화나 물량증가 등 외부요인으로 배송이 지연될 수 있습니다.)

◼ 상품명 : ${orderName}
◼ 택배사 : ${courier}
◼ 송장번호 : ${trackingNumber}

와코, 극강의 할인`,
    buttons: [
      {
        type: 'WL',
        name: '주문보기',
        linkMobile: `https://www.whatsupkorea.com/order`,
        linkPc: `https://www.whatsupkorea.com/order`,
      },
      {
        type: 'DS',
        name: '배송조회',
      },
    ],
  };
};

//? ------------------------------------------------------------------------ ?//
//? 결제성공
//? ------------------------------------------------------------------------ ?//
export const getTemplateOfPaymentSuccess = (
  phone: string,
  orderName: string,
  total: string,
  address: string,
  // orderId: string,
) => {
  return {
    phone: phone,
    code: 'PaymentSuccess250207',
    body: `[와코] 결제완료 안내

와코에서 상품을 구매해주셔서 고맙습니다. 통상적으로, 내일까지 상품의 송장번호가 안내됩니다. (주말, 연휴기간 안내가 지연될 수 있습니다.)

◼ 상품명 : ${orderName}
◼ 결제금액 : ${total}
◼ 배송지 : ${address}

와코, 극강의 할인`,
    buttons: [
      {
        type: 'WL',
        name: '주문보기',
        linkMobile: `https://www.whatsupkorea.com/order`,
        linkPc: `https://www.whatsupkorea.com/order`,
      },
    ],
  };
};

//? ------------------------------------------------------------------------ ?//
//! 결제요망 (미사용)
//? ------------------------------------------------------------------------ ?//

export const getTemplateOfPaymentStatusChange = (
  phone: string,
  orderName: string,
  orderId: string,
) => {
  return {
    phone: phone,
    code: 'PaymentStatus-changed-2412',
    body: `[결제요망]

상품의 결제상태가 변경되어 결제가 다시 필요하게 되었음을 안내드립니다.

- 상품 ${orderName}

감사합니다.
와코, 공대삼촌`,
    buttons: [
      {
        type: 'WL',
        name: '해당상품 보기',
        linkMobile: `https://whatsupkorea.com/order`,
        linkPc: `https://whatsupkorea.com/order`,
      },
    ],
  };
};

//? ------------------------------------------------------------------------ ?//
//! 쿠폰발급 (미사용)
//? ------------------------------------------------------------------------ ?//

export const getCouponIssuedBody = (
  phone: string,
  couponName: string,
  discount: number,
  expires: string,
) => {
  return {
    phone: phone,
    code: 'coupon-issued-2412', // 오픈알림
    body: `[쿠폰발급]

할인쿠폰 발급을 안내드립니다.

- 쿠폰 ${couponName}
- 할인 ${discount.toLocaleString()}원
- 사용기한 ${expires}

감사합니다.
와코, 공대삼촌`,
    buttons: [
      {
        type: 'WL',
        name: '해당상품 보기',
        linkMobile: `https://whatsupkorea.com/mypage/coupons`,
        linkPc: `https://whatsupkorea.com/mypage/coupons`,
      },
    ],
  };
};
