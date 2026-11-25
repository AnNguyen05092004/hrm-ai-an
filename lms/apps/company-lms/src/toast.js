// Thông báo nhanh: gọi toast() ở bất kỳ đâu, <Toaster /> trong ui.jsx hiển thị
let push = () => {}
export const toast = (text) => push(text)
export const onToast = (fn) => { push = fn }
