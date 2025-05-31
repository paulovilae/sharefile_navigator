import * as React from "react";
import { Layout } from "react-admin";
import MyMenu from "./MyMenu";
import CustomAppBar from '../components/layout/CustomAppBar';
import CustomSidebar from './CustomSidebar';

const MyLayout = (props) => <Layout {...props} menu={MyMenu} appBar={CustomAppBar} sidebar={CustomSidebar} />;

export default MyLayout;