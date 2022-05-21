export interface FulfillmentParams {
    readonly orders: Order[]
}

export interface Order {
    readonly orderId: number
    readonly items: OrderItem[]
}

export interface OrderItem {
    readonly bookId: number
    readonly type: OrderType
    readonly quantity: number
}

export type OrderType = "immediate" | "reserve"

export interface FulfillmentResult {
    readonly orders: OrderResult[]
}

export interface OrderResult {
    readonly orderId: number
    readonly status: OrderStatus
    readonly message?: string
}

export type OrderStatus = "accepted" | "error"

export interface OrderProcessor {
    fulfillOrders(params: FulfillmentParams): FulfillmentResult
}