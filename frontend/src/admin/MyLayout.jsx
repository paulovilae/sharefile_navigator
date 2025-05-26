import * as React from "react";
import { Layout } from "react-admin";
import MyMenu from "./MyMenu";
import CustomAppBar from '../components/layout/CustomAppBar';

const MyLayout = (props) => <Layout {...props} menu={MyMenu} appBar={CustomAppBar} />;

export default MyLayout; 