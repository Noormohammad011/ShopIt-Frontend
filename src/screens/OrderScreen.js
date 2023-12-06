import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { PayPalButton } from 'react-paypal-button-v2'
import { Link, useParams } from 'react-router-dom'
import {
  Row,
  Col,
  ListGroup,
  Image,
  Card,
  Button,
  Alert,
} from 'react-bootstrap'
import { useSelector, useDispatch } from 'react-redux'
import StripeCheckout from 'react-stripe-checkout'
import Message from '../components/Message'
import Loader from '../components/Loader'
import {
  getOrderDetails,
  payOrder,
  deliverOrder,
  payOrderStripe,
} from '../actions/orderActions'
import {
  ORDER_PAY_RESET,
  ORDER_DELIVER_RESET,
} from '../constants/orderConstatns'

const OrderScreen = ({ history }) => {
  const [sdkReady, setSdkReady] = useState(false)
  const dispatch = useDispatch()
  const { id } = useParams()
  const orderDetails = useSelector((state) => state.orderDetails)
  const { order, loading, error } = orderDetails
  const cart = useSelector((state) => state.cart)
  const { paymentMethod } = cart
  const orderPay = useSelector((state) => state.orderPay)
  const { loading: loadingPay, success: successPay } = orderPay
  const orderDeliver = useSelector((state) => state.orderDeliver)
  const { loading: loadingDeliver, success: successDeliver } = orderDeliver
  const userLogin = useSelector((state) => state.userLogin)
  const { userInfo } = userLogin

  if (!loading) {
    //   Calculate prices
    const addDecimals = (num) => {
      return (Math.round(num * 100) / 100).toFixed(2)
    }

    order.itemsPrice = addDecimals(
      order.orderItems.reduce((acc, item) => acc + item.price * item.qty, 0)
    )
  }

  useEffect(() => {
    if (!userInfo) {
      history.push('/login')
    }
    if (!order || order._id !== id) {
      dispatch(getOrderDetails(id))
    }

    if (paymentMethod === 'PayPal') {
      const addPayPalScript = async () => {
        const { data: clientId } = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/config/paypal`
        )
        const script = document.createElement('script')
        script.type = 'text/javascript'
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}`
        script.async = true
        script.onload = () => {
          setSdkReady(true)
        }
        document.body.appendChild(script)
      }
      if (!order || successPay || successDeliver || order._id !== id) {
        dispatch({ type: ORDER_PAY_RESET })
        dispatch({ type: ORDER_DELIVER_RESET })
        dispatch(getOrderDetails(id))
      } else if (!order.isPaid) {
        if (!window.paypal) {
          addPayPalScript().catch((err) => {
            console.log(err)
            window.location.reload()
          })
        } else {
          setSdkReady(true)
        }
      }
    }
    if (paymentMethod === 'Stripe') {
      if (!order || successPay || successDeliver || order._id !== id) {
        dispatch({ type: ORDER_PAY_RESET })
        dispatch({ type: ORDER_DELIVER_RESET })
        dispatch(getOrderDetails(id))
      }
    }
  }, [
    dispatch,
    id,
    successPay,
    successDeliver,
    order,
    userInfo,
    history,
    paymentMethod,
  ])

  const successPaymentHandler = (paymentResult) => {
    dispatch(payOrder(id, paymentResult))
  }
  const successPaymentHandlerStripe = (token) => {
    dispatch(payOrderStripe(id, token, order.totalPrice))
  }

  const deliverHandler = () => {
    dispatch(deliverOrder(order))
    window.location.reload()
  }
  return loading ? (
    <Loader />
  ) : error ? (
    <Message variant='danger'>{error}</Message>
  ) : (
    <>
      <h1>Order {order._id}</h1>
      <Row>
        <Col md={8}>
          <ListGroup variant='flush'>
            <ListGroup.Item>
              <h2>Shipping</h2>
              <p>
                <strong>Name: </strong> {order.user.name}
              </p>
              <p>
                <strong>Email: </strong>{' '}
                <a href={`mailto:${order.user.email}`}>{order.user.email}</a>
              </p>
              <p>
                <strong>Address:</strong>
                {order.shippingAddress.address}, {order.shippingAddress.city}{' '}
                {order.shippingAddress.postalCode},{' '}
                {order.shippingAddress.country}
              </p>
              {order.isDelivered ? (
                <Alert variant='success'>
                  Delivered on {order.deliveredAt}
                </Alert>
              ) : (
                <Alert variant='danger'>Not Delivered</Alert>
              )}
            </ListGroup.Item>

            <ListGroup.Item>
              <h2>Payment Method</h2>
              <p>
                <strong>Method: </strong>
                {order.paymentMethod}
              </p>
              {order.isPaid ? (
                <Alert variant='success'>Paid on {order.paidAt}</Alert>
              ) : (
                <Alert variant='danger'>Not Paid</Alert>
              )}
            </ListGroup.Item>

            <ListGroup.Item>
              <h2>Order Items</h2>
              {order.orderItems.length === 0 ? (
                <Message>Order is empty</Message>
              ) : (
                <ListGroup variant='flush'>
                  {order.orderItems.map((item, index) => (
                    <ListGroup.Item key={index}>
                      <Row>
                        <Col md={1}>
                          <Image
                            src={item.image}
                            alt={item.name}
                            fluid
                            rounded
                          />
                        </Col>
                        <Col>
                          <Link to={`/product/${item.product}`}>
                            {item.name}
                          </Link>
                        </Col>
                        <Col md={4}>
                          {item.qty} x ${item.price} = ${item.qty * item.price}
                        </Col>
                      </Row>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </ListGroup.Item>
          </ListGroup>
        </Col>
        <Col md={4}>
          <Card>
            <ListGroup variant='flush'>
              <ListGroup.Item>
                <h2>Order Summary</h2>
              </ListGroup.Item>
              <ListGroup.Item>
                <Row>
                  <Col>Items</Col>
                  <Col>${order.itemsPrice}</Col>
                </Row>
              </ListGroup.Item>
              <ListGroup.Item>
                <Row>
                  <Col>Shipping</Col>
                  <Col>${order.shippingPrice}</Col>
                </Row>
              </ListGroup.Item>
              <ListGroup.Item>
                <Row>
                  <Col>Tax</Col>
                  <Col>${order.taxPrice}</Col>
                </Row>
              </ListGroup.Item>
              <ListGroup.Item>
                <Row>
                  <Col>Total</Col>
                  <Col>${order.totalPrice}</Col>
                </Row>
              </ListGroup.Item>
              {!order.isPaid &&
                (paymentMethod === 'PayPal' ? (
                  <ListGroup.Item>
                    {loadingPay && <Loader />}
                    {!sdkReady ? (
                      <Loader />
                    ) : (
                      <PayPalButton
                        amount={order.totalPrice}
                        onSuccess={successPaymentHandler}
                      />
                    )}
                  </ListGroup.Item>
                ) : (
                  <ListGroup.Item>
                    {loadingPay && <Loader />}
                    <StripeCheckout
                      amount={order.totalPrice * 100}
                      shippingAddress
                      token={successPaymentHandlerStripe}
                      stripeKey={process.env.REACT_APP_STRIPE_KEY}
                      currency='USD'
                    >
                      <Button type='button' className='btn-block'>
                        Pay Now
                      </Button>
                    </StripeCheckout>
                  </ListGroup.Item>
                ))}
              {loadingDeliver && <Loader />}
              {userInfo &&
                userInfo.isAdmin &&
                order.isPaid &&
                !order.isDelivered && (
                  <ListGroup.Item>
                    <Button
                      type='button'
                      className='btn btn-block'
                      onClick={deliverHandler}
                    >
                      Mark As Delivered
                    </Button>
                  </ListGroup.Item>
                )}
            </ListGroup>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default OrderScreen
