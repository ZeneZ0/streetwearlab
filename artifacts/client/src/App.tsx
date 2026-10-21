import type { ReactNode } from "react";
import { Redirect, Route, Switch } from "wouter";
import Layout from "./components/Layout";
import { useAuth } from "./lib/auth";
import Catalog from "./pages/Catalog";
import ProductPage from "./pages/Product";
import Studio from "./pages/Studio";
import CartPage from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Payment from "./pages/Payment";
import Orders from "./pages/Orders";
import OrderDetails from "./pages/OrderDetails";
import { Login, Register, Profile } from "./pages/Auth";
import AdminReviews from "./pages/AdminReviews";
import { AdminOrders, AdminProducts } from "./pages/AdminOrders";
import { Loading } from "./components/ui";

function Private({ children, admin }: { children: ReactNode; admin?: boolean }) {
  const { user, ready } = useAuth();
  if (!ready) return <Loading />;
  if (!user) return <Redirect to="/login" />;
  if (admin && user.role === "client") return <Redirect to="/" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Layout>
      <Switch>
        <Route path="/"><Redirect to="/catalog" /></Route>
        <Route path="/catalog" component={Catalog} />
        <Route path="/studio" component={Studio} />
        <Route path="/products/:id">{(p) => <ProductPage id={Number(p.id)} />}</Route>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/profile"><Private><Profile /></Private></Route>
        <Route path="/cart"><Private><CartPage /></Private></Route>
        <Route path="/checkout"><Private><Checkout /></Private></Route>
        <Route path="/payment/:id">{(p) => <Private><Payment id={Number(p.id)} /></Private>}</Route>
        <Route path="/orders"><Private><Orders /></Private></Route>
        <Route path="/orders/:id">{(p) => <Private><OrderDetails id={Number(p.id)} /></Private>}</Route>
        <Route path="/admin/reviews"><Private admin><AdminReviews /></Private></Route>
        <Route path="/admin/orders"><Private admin><AdminOrders /></Private></Route>
        <Route path="/admin/products"><Private admin><AdminProducts /></Private></Route>
        <Route><div className="wrap" style={{ width: 600 }}><h1>Страница не найдена</h1></div></Route>
      </Switch>
    </Layout>
  );
}
