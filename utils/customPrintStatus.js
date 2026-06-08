/**
 * Pure mapping from a CustomPrintRequest.status to the customer-facing stage,
 * messaging, and whether it blocks checkout. Single source of truth so the cart,
 * account, and editor all describe a request consistently — and so a request the
 * customer has finished is never called "Incomplete" while it's merely awaiting a
 * quote.
 */

/**
 * @param {string} status
 * @returns {{stage:string, actionNeeded:boolean, payable:boolean, title:string, message:string}}
 */
export function customPrintStage(status) {
  switch (status) {
    case 'pending_upload':
    case 'pending_config':
      return {
        stage: 'action_needed',
        actionNeeded: true,
        payable: false,
        title: 'Finish your print request',
        message: 'Upload your 3D model and configure your print to continue.',
      }
    case 'configured':
      return {
        stage: 'awaiting_quote',
        actionNeeded: false,
        payable: false,
        title: 'Preparing your quote',
        message: "Your configuration is in, we're finalising your quote.",
      }
    case 'quoted':
    case 'payment_pending':
      return {
        stage: 'ready_to_pay',
        actionNeeded: false,
        payable: true,
        title: 'Ready to checkout',
        message: 'Your quote is ready, you can proceed to payment.',
      }
    case 'paid':
    case 'printing':
    case 'printed':
    case 'shipped':
    case 'delivered':
      return {
        stage: 'in_production',
        actionNeeded: false,
        payable: true,
        title: 'In progress',
        message: 'Your order is being fulfilled.',
      }
    case 'cancelled':
      return {
        stage: 'cancelled',
        actionNeeded: false,
        payable: false,
        title: 'Cancelled',
        message: 'This request was cancelled.',
      }
    default:
      return {
        stage: 'unknown',
        actionNeeded: false,
        payable: false,
        title: '',
        message: '',
      }
  }
}

/** A custom print blocks checkout until it has a quote (i.e. not yet payable). */
export function isCustomPrintBlockingCheckout(status) {
  const s = customPrintStage(status)
  return s.stage === 'action_needed' || s.stage === 'awaiting_quote'
}
