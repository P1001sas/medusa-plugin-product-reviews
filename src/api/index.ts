import errorHandler from "@medusajs/medusa/dist/api/middlewares/error-handler"
import configLoader from "@medusajs/medusa/dist/loaders/config"
import bodyParser from "body-parser"
import cors from "cors"
import { Router } from "express"
import { parseCorsOrigins } from "medusa-core-utils"
import {
  ConfigModule,
  authenticate,
  authenticateCustomer,
} from "@medusajs/medusa"
import { routes as productReviewRoutes } from "./routes/product-review-routes"
import { routes as productReviewRequestRoutes } from "./routes/product-review-request-routes"

export type RouteMethod =
  | "all"
  | "get"
  | "post"
  | "put"
  | "delete"
  | "patch"
  | "options"
  | "head"
export interface RouteConfig {
  path: string
  method: RouteMethod
  handlers: any[]
  requiredAuth: boolean
}

const routes: RouteConfig[] = [
  ...productReviewRoutes,
  ...productReviewRequestRoutes,
]

export default function (rootDirectory: string) {
  const config = configLoader(rootDirectory)
  const router = Router()

  router.use(bodyParser.json())

  const adminCors = cors({
    origin: parseCorsOrigins(config.projectConfig.admin_cors || ""),
    credentials: true,
  })
  const storeCors = cors({
    origin: parseCorsOrigins(config.projectConfig.store_cors || ""),
    credentials: true,
  })

  router.use((req, res, next) => {
    if (req.path.startsWith("/admin")) return adminCors(req, res, next)
    if (req.path.startsWith("/store")) return storeCors(req, res, next)
    return next()
  })

  for (const route of routes) createRoute(config, router, route)

  router.use(errorHandler())

  return router
}

export const createRoute = (
  config: ConfigModule,
  router: Router,
  route: RouteConfig
) => {
  try {
    if (route.path.startsWith("/admin"))
      return createAdminRoute(config, router, route)
    if (route.path.startsWith("/store"))
      return createStoreRoute(config, router, route)
  } catch (error) {
    console.error(error, route)
  }
}

const createAdminRoute = (
  config: ConfigModule,
  router: Router,
  route: RouteConfig
) => {
  const { method, path, handlers, requiredAuth } = route
  const defaultAdminMiddleware = [requiredAuth ? authenticate() : null].filter(
    (a) => a !== null
  )

  router[method](path, ...defaultAdminMiddleware, ...handlers)
}

const createStoreRoute = (
  config: ConfigModule,
  router: Router,
  route: RouteConfig
) => {
  const { method, path, handlers, requiredAuth } = route

  const defaultMiddleware = [
    requiredAuth ? authenticateCustomer() : null,
  ].filter((a) => a)

  router[method](path, ...defaultMiddleware, ...handlers)
}