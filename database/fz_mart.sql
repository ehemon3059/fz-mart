-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 03, 2026 at 05:07 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `fz_mart`
--

-- --------------------------------------------------------

--
-- Table structure for table `adminactivitylog`
--

CREATE TABLE `adminactivitylog` (
  `id` int(11) NOT NULL,
  `adminId` int(11) DEFAULT NULL,
  `actorName` varchar(191) NOT NULL,
  `action` varchar(191) NOT NULL,
  `detail` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `adminactivitylog`
--

INSERT INTO `adminactivitylog` (`id`, `adminId`, `actorName`, `action`, `detail`, `createdAt`) VALUES
(1, 2, 'e2e-admin', 'order.status_change', 'Order E2E1783046648235611 → CONFIRMED', '2026-07-03 02:44:39.836'),
(2, 2, 'e2e-admin', 'order.status_change', 'Order E2E1783051310412180 → CONFIRMED', '2026-07-03 04:02:16.348'),
(3, 2, 'e2e-admin', 'order.status_change', 'Order E2E1783076854184812 → CONFIRMED', '2026-07-03 11:08:25.370'),
(4, 2, 'e2e-admin', 'order.status_change', 'Order E2E1783077507231236 → CONFIRMED', '2026-07-03 11:19:05.047'),
(5, 1, 'admin', 'admin.invite', 'Invited eh.emon3059@gmail.com as MANAGER', '2026-07-03 12:20:11.544');

-- --------------------------------------------------------

--
-- Table structure for table `adminuser`
--

CREATE TABLE `adminuser` (
  `id` int(11) NOT NULL,
  `username` varchar(191) NOT NULL,
  `passwordHash` varchar(191) NOT NULL,
  `role` enum('OWNER','MANAGER','STAFF') NOT NULL DEFAULT 'STAFF',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `email` varchar(191) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `twoFactorSecret` varchar(191) DEFAULT NULL,
  `twoFactorEnabled` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `adminuser`
--

INSERT INTO `adminuser` (`id`, `username`, `passwordHash`, `role`, `createdAt`, `email`, `isActive`, `twoFactorSecret`, `twoFactorEnabled`) VALUES
(1, 'admin', '$2b$12$UUBuouYkJDN7gUOrVcCxxe7HwndB82eF.1JMi5QWyEdYH2SXj8Vmy', 'OWNER', '2026-06-21 11:57:38.251', 'no.one3059@gmail.com', 1, NULL, 0),
(2, 'e2e-admin', '$2b$12$X1GSbhHkYwkTdQffLHn9g.VfuE6QF6hiHb4EALTmNl.6oqXdRBl8K', 'OWNER', '2026-07-02 16:59:57.971', 'e2e-admin@example.com', 1, NULL, 0),
(3, 'ehemon3059', '$2b$12$2euqv3xbynwjevr.cDA5judQdqDL48q5fgHkqHiR0IHPVkND2AOi2', 'MANAGER', '2026-07-03 12:20:11.501', 'eh.emon3059@gmail.com', 1, NULL, 0);

-- --------------------------------------------------------

--
-- Table structure for table `banner`
--

CREATE TABLE `banner` (
  `id` int(11) NOT NULL,
  `imageUrl` varchar(191) NOT NULL,
  `link` varchar(191) DEFAULT NULL,
  `sortOrder` int(11) NOT NULL DEFAULT 0,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `slot` enum('MAIN','RIGHT_TOP','RIGHT_BOTTOM') NOT NULL DEFAULT 'MAIN'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `banner`
--

INSERT INTO `banner` (`id`, `imageUrl`, `link`, `sortOrder`, `isActive`, `createdAt`, `slot`) VALUES
(1, '/uploads/banners/1782204605238-2335a9b9-cdb2-4972-921d-6c685aef53d2.png', '/category/electronics', 0, 1, '2026-06-21 11:57:38.355', 'MAIN'),
(2, '/uploads/banners/1782204459561-73037072-9bb5-41b6-9511-e289c6a84188.png', NULL, 0, 1, '2026-06-23 08:46:24.315', 'MAIN'),
(3, '/uploads/banners/1782204551290-06811d8c-bb85-40d9-879f-6423f3162813.png', NULL, 0, 1, '2026-06-23 08:49:12.373', 'MAIN'),
(6, '/uploads/banners/1782729698549-575f42a8-ba26-42bf-a50a-5397e6b05d05.jpg', NULL, 0, 1, '2026-06-28 14:31:01.712', 'RIGHT_TOP'),
(7, '/uploads/banners/1782729648065-f11a8cdf-db4d-42fb-801c-9bb583dee4b4.jpg', NULL, 0, 1, '2026-06-28 14:40:58.793', 'RIGHT_BOTTOM'),
(9, '/uploads/banners/1782728748812-76f47884-bca5-4c84-b2d1-d496e054be5d.jpg', NULL, 0, 1, '2026-06-29 10:25:50.456', 'MAIN'),
(10, '/uploads/banners/1782729141240-e6de7ab5-a4b6-42c3-8f28-370f2a589dc4.jpg', NULL, 0, 1, '2026-06-29 10:32:24.795', 'MAIN'),
(11, '/uploads/banners/1782729540908-fd0fa236-6d2f-4052-acce-894081b27bcf.jpg', NULL, 0, 1, '2026-06-29 10:39:02.380', 'MAIN');

-- --------------------------------------------------------

--
-- Table structure for table `blockedip`
--

CREATE TABLE `blockedip` (
  `id` int(11) NOT NULL,
  `ip` varchar(191) NOT NULL,
  `reason` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cartsession`
--

CREATE TABLE `cartsession` (
  `id` int(11) NOT NULL,
  `customerId` varchar(191) DEFAULT NULL,
  `email` varchar(191) DEFAULT NULL,
  `phone` varchar(191) DEFAULT NULL,
  `items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`items`)),
  `subtotal` int(11) NOT NULL,
  `recoveryToken` varchar(191) NOT NULL,
  `reminderSentAt` datetime(3) DEFAULT NULL,
  `recoveredAt` datetime(3) DEFAULT NULL,
  `orderedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `category`
--

CREATE TABLE `category` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `sortOrder` int(11) NOT NULL DEFAULT 0,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `metaDescription` text DEFAULT NULL,
  `metaTitle` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `category`
--

INSERT INTO `category` (`id`, `name`, `slug`, `sortOrder`, `isActive`, `createdAt`, `updatedAt`, `metaDescription`, `metaTitle`) VALUES
(1, 'Electronics', 'electronics', 0, 1, '2026-06-21 11:57:38.279', '2026-06-21 11:57:38.279', NULL, NULL),
(2, 'Fashion', 'fashion', 5, 1, '2026-06-22 13:27:16.392', '2026-06-22 13:27:16.392', NULL, NULL),
(3, 'Home & Living', 'home-living', 0, 1, '2026-06-22 13:33:50.444', '2026-06-22 13:33:50.444', NULL, NULL),
(4, 'Grocery', 'grocery', 0, 1, '2026-06-22 13:34:15.518', '2026-06-22 13:34:15.518', NULL, NULL),
(5, 'Beauty', 'beauty', 0, 1, '2026-06-22 13:34:29.401', '2026-06-22 13:34:29.401', NULL, NULL),
(6, 'Mobile & Gadgets', 'mobile-gadgets', 0, 1, '2026-06-22 13:34:39.354', '2026-06-22 13:34:39.354', NULL, NULL),
(7, 'Health', 'health', 0, 1, '2026-06-22 13:34:52.017', '2026-06-22 13:34:52.017', NULL, NULL),
(8, 'Sports', 'sports', 0, 1, '2026-06-22 13:35:05.926', '2026-06-22 13:35:05.926', NULL, NULL),
(9, 'Toys & Baby', 'toys-baby', 0, 1, '2026-06-22 13:35:20.245', '2026-06-22 13:35:20.245', NULL, NULL),
(10, 'Books', 'books', 0, 1, '2026-06-22 13:35:36.781', '2026-06-22 13:35:36.781', NULL, NULL),
(11, 'Automotive', 'automotive', 0, 1, '2026-06-22 13:35:55.049', '2026-06-22 13:36:35.071', NULL, NULL),
(12, 'Stationery', 'stationery', 0, 1, '2026-06-22 13:36:50.109', '2026-06-22 13:36:50.109', NULL, NULL),
(13, 'E2E Tests', 'e2e-tests', 99, 1, '2026-07-02 16:59:57.999', '2026-07-02 16:59:57.999', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `coupon`
--

CREATE TABLE `coupon` (
  `id` int(11) NOT NULL,
  `code` varchar(191) NOT NULL,
  `type` enum('PERCENT','FIXED') NOT NULL,
  `value` int(11) NOT NULL,
  `minOrder` int(11) NOT NULL DEFAULT 0,
  `maxDiscount` int(11) DEFAULT NULL,
  `usageLimit` int(11) DEFAULT NULL,
  `perCustomerLimit` int(11) DEFAULT NULL,
  `startsAt` datetime(3) DEFAULT NULL,
  `endsAt` datetime(3) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `timesUsed` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `coupon`
--

INSERT INTO `coupon` (`id`, `code`, `type`, `value`, `minOrder`, `maxDiscount`, `usageLimit`, `perCustomerLimit`, `startsAt`, `endsAt`, `isActive`, `timesUsed`, `createdAt`, `updatedAt`) VALUES
(1, 'E2E100', 'FIXED', 10000, 0, NULL, NULL, NULL, NULL, NULL, 1, 3, '2026-07-03 04:10:18.673', '2026-07-03 11:20:32.174');

-- --------------------------------------------------------

--
-- Table structure for table `couponredemption`
--

CREATE TABLE `couponredemption` (
  `id` int(11) NOT NULL,
  `couponId` int(11) NOT NULL,
  `orderId` int(11) NOT NULL,
  `customerId` varchar(191) DEFAULT NULL,
  `customerPhone` varchar(191) NOT NULL,
  `amount` int(11) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `couponredemption`
--

INSERT INTO `couponredemption` (`id`, `couponId`, `orderId`, `customerId`, `customerPhone`, `amount`, `createdAt`) VALUES
(1, 1, 52, NULL, '01774057415', 10000, '2026-07-03 04:10:43.817'),
(2, 1, 56, NULL, '01733525084', 10000, '2026-07-03 11:09:08.390'),
(3, 1, 69, NULL, '01757826433', 10000, '2026-07-03 11:20:32.179');

-- --------------------------------------------------------

--
-- Table structure for table `couriershipment`
--

CREATE TABLE `couriershipment` (
  `id` int(11) NOT NULL,
  `orderId` int(11) NOT NULL,
  `courierName` varchar(191) NOT NULL,
  `consignmentId` varchar(191) NOT NULL,
  `trackingCode` varchar(191) DEFAULT NULL,
  `courierStatus` varchar(191) NOT NULL,
  `lastSyncedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `couriershipment`
--

INSERT INTO `couriershipment` (`id`, `orderId`, `courierName`, `consignmentId`, `trackingCode`, `courierStatus`, `lastSyncedAt`, `createdAt`) VALUES
(2, 8, 'Test Courier', 'STUB-1782204239159', 'STUB-1782204239159', 'pending', '2026-06-23 08:43:59.161', '2026-06-23 08:43:59.161'),
(3, 10, 'Test Courier', 'STUB-1782391735547', 'STUB-1782391735547', 'pending', '2026-06-25 12:49:10.290', '2026-06-25 12:48:55.549'),
(4, 11, 'Test Courier', 'STUB-1782916481670', 'STUB-1782916481670', 'pending', '2026-07-01 14:34:41.671', '2026-07-01 14:34:41.671');

-- --------------------------------------------------------

--
-- Table structure for table `customer`
--

CREATE TABLE `customer` (
  `id` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `name` varchar(191) DEFAULT NULL,
  `avatarUrl` varchar(191) DEFAULT NULL,
  `provider` enum('GOOGLE','EMAIL') NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `customer`
--

INSERT INTO `customer` (`id`, `email`, `name`, `avatarUrl`, `provider`, `createdAt`) VALUES
('fz-01C796', 'no.one3059@gmail.com', 'No One', 'https://lh3.googleusercontent.com/a/ACg8ocKYhnk0zRXGEuk6e0NWXJM2JkCbmbltIpU97RsunaVBNBU4Lf0=s96-c', 'GOOGLE', '2026-06-25 07:47:06.657'),
('fz-65B7A6', 'most.wanted3059@gmail.com', 'E.H. Emon', 'https://lh3.googleusercontent.com/a/ACg8ocKnye_ZvTzdhofyns_QRBtmB-0K0nABWeRDGbP9PWhZOCbpSKJ0=s96-c', 'GOOGLE', '2026-06-27 05:14:09.194'),
('fz-9D3FE2', 'eh.emon3059@gmail.com', 'Eh Emon', 'https://lh3.googleusercontent.com/a/ACg8ocLSvHpdKm1-ewNd_rE1qImL5OwdXLVZtjBdgHDvQAjxGqKeyokQ=s96-c', 'EMAIL', '2026-06-24 10:28:48.599');

-- --------------------------------------------------------

--
-- Table structure for table `expense`
--

CREATE TABLE `expense` (
  `id` int(11) NOT NULL,
  `category` enum('MARKETING','SOFTWARE','RENT','SALARY','UTILITIES','PACKAGING','OTHER') NOT NULL DEFAULT 'OTHER',
  `description` varchar(191) NOT NULL,
  `amount` int(11) NOT NULL,
  `incurredOn` datetime(3) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `faqitem`
--

CREATE TABLE `faqitem` (
  `id` int(11) NOT NULL,
  `question` varchar(191) NOT NULL,
  `answer` text NOT NULL,
  `sortOrder` int(11) NOT NULL DEFAULT 0,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `faqitem`
--

INSERT INTO `faqitem` (`id`, `question`, `answer`, `sortOrder`, `isActive`, `createdAt`, `updatedAt`) VALUES
(1, 'How do I place an order?', 'Add products to your cart and proceed to checkout.', 0, 1, '2026-06-22 07:24:06.867', '2026-06-22 07:24:06.867'),
(2, 'Do you offer Cash on Delivery?', 'Yes, all orders are Cash on Delivery.', 1, 1, '2026-06-22 07:24:06.873', '2026-06-22 07:24:06.873'),
(3, 'How can I track my order?', 'Use the order tracking page with your order number and phone.', 2, 1, '2026-06-22 07:24:06.879', '2026-06-22 07:24:06.879');

-- --------------------------------------------------------

--
-- Table structure for table `flashsale`
--

CREATE TABLE `flashsale` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `startsAt` datetime(3) NOT NULL,
  `endsAt` datetime(3) NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `flashsale`
--

INSERT INTO `flashsale` (`id`, `name`, `startsAt`, `endsAt`, `isActive`, `createdAt`, `updatedAt`) VALUES
(1, 'Mega Eid Sale', '2026-06-24 15:00:00.000', '2026-06-25 15:00:00.000', 1, '2026-06-23 08:31:43.117', '2026-06-23 08:31:43.117'),
(2, 'This Is Biggest offer for 1 Hour', '2026-06-23 08:34:00.000', '2026-06-23 09:34:00.000', 1, '2026-06-23 08:34:57.822', '2026-06-23 08:34:57.822');

-- --------------------------------------------------------

--
-- Table structure for table `flashsaleproduct`
--

CREATE TABLE `flashsaleproduct` (
  `id` int(11) NOT NULL,
  `flashSaleId` int(11) NOT NULL,
  `productId` int(11) NOT NULL,
  `salePrice` int(11) DEFAULT NULL,
  `sortOrder` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `flashsaleproduct`
--

INSERT INTO `flashsaleproduct` (`id`, `flashSaleId`, `productId`, `salePrice`, `sortOrder`) VALUES
(1, 1, 8, NULL, 0),
(2, 1, 6, NULL, 1),
(3, 1, 3, NULL, 2),
(4, 1, 5, NULL, 3),
(5, 2, 8, NULL, 0),
(6, 2, 6, NULL, 1),
(7, 2, 3, NULL, 2),
(8, 2, 5, NULL, 3);

-- --------------------------------------------------------

--
-- Table structure for table `fraudcheckresult`
--

CREATE TABLE `fraudcheckresult` (
  `id` int(11) NOT NULL,
  `phone` varchar(191) NOT NULL,
  `totalOrders` int(11) NOT NULL DEFAULT 0,
  `successOrders` int(11) NOT NULL DEFAULT 0,
  `returnOrders` int(11) NOT NULL DEFAULT 0,
  `riskScore` int(11) NOT NULL,
  `checkedAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `logintoken`
--

CREATE TABLE `logintoken` (
  `id` int(11) NOT NULL,
  `email` varchar(191) NOT NULL,
  `token` varchar(191) NOT NULL,
  `expiresAt` datetime(3) NOT NULL,
  `usedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `logintoken`
--

INSERT INTO `logintoken` (`id`, `email`, `token`, `expiresAt`, `usedAt`, `createdAt`) VALUES
(1, 'eh.emon3059@gmail.com', '387f088af30aa5545225b1989befd182b215666d78d63c325d80479d4141a9f2', '2026-06-24 10:35:27.812', NULL, '2026-06-24 10:20:27.813'),
(2, 'eh.emon3059@gmail.com', '1ecc869fd24a68e46a008e500f3e8dc1dcc4025219d85d8c789c938839fe9443', '2026-06-24 10:36:12.718', '2026-06-24 10:28:48.589', '2026-06-24 10:21:12.719'),
(3, 'eh.emon3059@gmail.com', '890433a0eabc4cff5cbbdeb42d119de75a4453ba987070fa3b8832a7f66e53e2', '2026-06-24 10:42:38.516', NULL, '2026-06-24 10:27:38.517'),
(4, 'no.one3059@gmail.com', 'd16d8d11d3d896ee8ce5b33f3386516f7a215720bb32b98274c4f9f1d224a799', '2026-06-25 11:19:49.513', '2026-06-25 11:05:12.238', '2026-06-25 11:04:49.515');

-- --------------------------------------------------------

--
-- Table structure for table `maillog`
--

CREATE TABLE `maillog` (
  `id` int(11) NOT NULL,
  `to` varchar(191) NOT NULL,
  `subject` varchar(191) NOT NULL,
  `template` varchar(191) NOT NULL,
  `status` enum('PENDING','SENT','FAILED') NOT NULL DEFAULT 'PENDING',
  `error` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `maillog`
--

INSERT INTO `maillog` (`id`, `to`, `subject`, `template`, `status`, `error`, `createdAt`) VALUES
(9, 'eh.emon3059@gmail.com', 'Order FZ782858 confirmed — fz-mart', 'order-confirmation', 'SENT', NULL, '2026-06-24 10:28:17.062'),
(10, 'eh.emon3059@gmail.com', 'Your fz-mart sign-in link', 'magic-link', 'SENT', NULL, '2026-06-24 10:28:20.399'),
(11, 'eh.emon3059@gmail.com', 'Your fz-mart sign-in link', 'magic-link', 'SENT', NULL, '2026-06-24 10:28:23.718'),
(12, 'eh.emon3059@gmail.com', 'Your fz-mart sign-in link', 'magic-link', 'SENT', NULL, '2026-06-24 10:28:27.103'),
(13, 'no.one3059@gmail.com', 'Your fz-mart sign-in link', 'magic-link', 'SENT', NULL, '2026-06-25 11:04:54.167'),
(14, 'eh.web.dev200@gmail.com', 'Order FZ366918 confirmed — fz-mart', 'order-confirmation', 'SENT', NULL, '2026-06-25 12:45:53.945'),
(15, 'eh.emon3059@gmail.com', 'Order FZ086968 confirmed — fz-mart', 'order-confirmation', 'SENT', NULL, '2026-07-02 14:42:34.111'),
(16, 'eh.emon3059@gmail.com', 'Order FZ092626 confirmed — fz-mart', 'order-confirmation', 'SENT', NULL, '2026-07-02 14:42:37.475'),
(17, 'eh.emon3059@gmail.com', 'Order FZ334589 confirmed — fz-mart', 'order-confirmation', 'SENT', NULL, '2026-07-02 14:42:40.779'),
(18, 'no.one3059@gmail.com', 'Reset your fz-mart admin password', 'password-reset', 'SENT', NULL, '2026-07-02 14:50:22.321');

-- --------------------------------------------------------

--
-- Table structure for table `order`
--

CREATE TABLE `order` (
  `id` int(11) NOT NULL,
  `orderNo` varchar(191) NOT NULL,
  `customerName` varchar(191) NOT NULL,
  `customerPhone` varchar(191) NOT NULL,
  `address` text NOT NULL,
  `shippingZoneId` int(11) DEFAULT NULL,
  `deliveryCharge` int(11) NOT NULL DEFAULT 0,
  `subtotal` int(11) NOT NULL,
  `total` int(11) NOT NULL,
  `status` enum('PENDING_PAYMENT','PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED','RETURNED') NOT NULL DEFAULT 'PENDING',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `customerEmail` varchar(191) DEFAULT NULL,
  `customerId` varchar(191) DEFAULT NULL,
  `customerNote` text DEFAULT NULL,
  `shippingCost` int(11) NOT NULL DEFAULT 0,
  `returnShippingCost` int(11) NOT NULL DEFAULT 0,
  `paymentGatewayFee` int(11) NOT NULL DEFAULT 0,
  `returnRestockable` tinyint(1) NOT NULL DEFAULT 1,
  `paidAmount` int(11) NOT NULL DEFAULT 0,
  `paymentMethod` enum('COD','ONLINE','PARTIAL') NOT NULL DEFAULT 'COD',
  `couponCode` varchar(191) DEFAULT NULL,
  `couponDiscount` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `order`
--

INSERT INTO `order` (`id`, `orderNo`, `customerName`, `customerPhone`, `address`, `shippingZoneId`, `deliveryCharge`, `subtotal`, `total`, `status`, `createdAt`, `updatedAt`, `customerEmail`, `customerId`, `customerNote`, `shippingCost`, `returnShippingCost`, `paymentGatewayFee`, `returnRestockable`, `paidAmount`, `paymentMethod`, `couponCode`, `couponDiscount`) VALUES
(8, 'FZ782858', 'Md Emran Hossain Emon', '01856247747', 'pathaliya west para , jamalpur sadar', 2, 12000, 319800, 331800, 'CONFIRMED', '2026-06-22 04:25:48.436', '2026-06-23 08:39:42.738', 'eh.emon3059@gmail.com', NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(10, 'FZ366918', 'eh web', '01721821456', 'pathaliya , jamalpur', 2, 12000, 179900, 191900, 'CANCELLED', '2026-06-25 12:45:49.579', '2026-06-25 12:49:06.388', 'eh.web.dev200@gmail.com', NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(11, 'FZ086968', 'Md Emran Hossain Emon', '01856247747', 'pathaliya west para , jamalpur sadar', 2, 12000, 25000, 37000, 'SHIPPED', '2026-07-01 14:33:44.078', '2026-07-01 14:34:52.950', 'eh.emon3059@gmail.com', 'fz-01C796', NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(12, 'FZ092626', 'Md Emran Hossain Emon', '01856247747', 'pathaliya west para , jamalpur sadar', 1, 6000, 100000, 106000, 'DELIVERED', '2026-07-02 13:04:20.809', '2026-07-02 13:05:09.848', 'eh.emon3059@gmail.com', NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(13, 'FZ334589', 'Md Emran Hossain Emon', '01856247747', 'pathaliya west para , jamalpur sadar', 1, 6000, 100000, 106000, 'DELIVERED', '2026-07-02 13:07:07.885', '2026-07-02 13:07:22.108', 'eh.emon3059@gmail.com', NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(14, 'E2E1783011604157199', 'E2E Admin Flow', '01799767063', 'E2E test address, Dhaka', 1, 6000, 150000, 156000, 'PENDING', '2026-07-02 17:00:04.160', '2026-07-02 17:00:04.160', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(15, 'E2E1783012693244337', 'E2E Admin Flow', '01743069349', 'E2E test address, Dhaka', 1, 6000, 150000, 156000, 'CONFIRMED', '2026-07-02 17:18:13.246', '2026-07-02 17:18:37.632', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(16, 'FZ361558', 'E2E Buy Now Shopper', '01747834080', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 80000, 86000, 'PENDING', '2026-07-02 17:18:50.743', '2026-07-02 17:18:50.743', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(17, 'FZ636949', 'E2E Guest Shopper', '01745551645', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'PENDING', '2026-07-02 17:19:08.271', '2026-07-02 17:19:08.271', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(18, 'FZ421226', 'E2E Racer B', '01787739607', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 99900, 105900, 'PENDING', '2026-07-02 17:19:23.901', '2026-07-02 17:19:23.901', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(19, 'FZ255715', 'E2E Guest Shopper', '01760334843', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'PENDING', '2026-07-02 17:20:52.302', '2026-07-02 17:20:52.302', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(20, 'E2E1783013054697528', 'E2E Admin Flow', '01788586360', 'E2E test address, Dhaka', 1, 6000, 150000, 156000, 'CONFIRMED', '2026-07-02 17:24:14.701', '2026-07-02 17:24:36.750', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(21, 'FZ780902', 'E2E Buy Now Shopper', '01769247330', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 80000, 86000, 'PENDING', '2026-07-02 17:24:52.650', '2026-07-02 17:24:52.650', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(22, 'FZ678716', 'E2E Guest Shopper', '01795636593', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'PENDING', '2026-07-02 17:25:21.529', '2026-07-02 17:25:21.529', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(23, 'FZ324484', 'E2E Racer B', '01739545114', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 99900, 105900, 'PENDING', '2026-07-02 17:25:35.747', '2026-07-02 17:25:35.747', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(24, 'E2E1783016406053990', 'E2E Admin Flow', '01764631591', 'E2E test address, Dhaka', 1, 6000, 150000, 156000, 'CONFIRMED', '2026-07-02 18:20:06.055', '2026-07-02 18:20:40.942', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(25, 'FZ635748', 'E2E Buy Now Shopper', '01748144075', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 80000, 86000, 'PENDING', '2026-07-02 18:21:04.444', '2026-07-02 18:21:04.444', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(26, 'FZ857430', 'E2E Guest Shopper', '01758990277', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'PENDING', '2026-07-02 18:21:23.573', '2026-07-02 18:21:23.573', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(27, 'FZ534889', 'E2E Racer B', '01799309950', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 99900, 105900, 'PENDING', '2026-07-02 18:21:35.855', '2026-07-02 18:21:35.855', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(28, 'FZ884973', 'E2E Online Shopper', '01720912094', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'PENDING', '2026-07-02 18:21:43.440', '2026-07-02 18:21:53.845', NULL, NULL, NULL, 0, 0, 3900, 1, 156000, 'ONLINE', NULL, 0),
(29, 'FZ895609', 'E2E Online Shopper', '01783930491', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'PENDING', '2026-07-02 18:22:05.072', '2026-07-02 18:22:06.014', NULL, NULL, NULL, 0, 0, 150, 1, 6000, 'PARTIAL', NULL, 0),
(30, 'FZ986734', 'E2E Online Shopper', '01765222493', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'CANCELLED', '2026-07-02 18:22:14.147', '2026-07-02 18:22:14.805', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'ONLINE', NULL, 0),
(31, 'E2E1783019875464467', 'E2E Admin Flow', '01767069672', 'E2E test address, Dhaka', 1, 6000, 150000, 156000, 'CONFIRMED', '2026-07-02 19:17:55.466', '2026-07-02 19:18:15.115', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(32, 'FZ671263', 'E2E Buy Now Shopper', '01706374870', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 80000, 86000, 'PENDING', '2026-07-02 19:18:27.652', '2026-07-02 19:18:27.652', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(33, 'FZ528660', 'E2E Guest Shopper', '01771160214', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'PENDING', '2026-07-02 19:18:41.020', '2026-07-02 19:18:41.020', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(34, 'FZ353408', 'E2E Racer A', '01746925080', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 99900, 105900, 'PENDING', '2026-07-02 19:18:50.823', '2026-07-02 19:18:50.823', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(35, 'FZ758131', 'E2E Online Shopper', '01755030227', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'PENDING', '2026-07-02 19:18:57.391', '2026-07-02 19:19:04.270', NULL, NULL, NULL, 0, 0, 3900, 1, 156000, 'ONLINE', NULL, 0),
(36, 'FZ389122', 'E2E Online Shopper', '01702811190', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'PENDING', '2026-07-02 19:19:13.046', '2026-07-02 19:19:13.696', NULL, NULL, NULL, 0, 0, 150, 1, 6000, 'PARTIAL', NULL, 0),
(37, 'FZ873789', 'E2E Online Shopper', '01764643528', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'CANCELLED', '2026-07-02 19:19:20.784', '2026-07-02 19:19:21.402', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'ONLINE', NULL, 0),
(38, 'E2E1783046648235611', 'E2E Admin Flow', '01703036924', 'E2E test address, Dhaka', 1, 6000, 150000, 156000, 'CONFIRMED', '2026-07-03 02:44:08.237', '2026-07-03 02:44:39.821', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(39, 'FZ457951', 'E2E Buy Now Shopper', '01777551462', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 80000, 86000, 'PENDING', '2026-07-03 02:44:59.003', '2026-07-03 02:44:59.003', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(40, 'FZ316229', 'E2E Guest Shopper', '01735374966', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'PENDING', '2026-07-03 02:45:29.554', '2026-07-03 02:45:29.554', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(41, 'FZ914339', 'E2E Racer B', '01706327651', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 99900, 105900, 'PENDING', '2026-07-03 02:45:41.278', '2026-07-03 02:45:41.278', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(42, 'FZ650716', 'E2E Online Shopper', '01737120471', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'PENDING', '2026-07-03 02:45:52.419', '2026-07-03 02:46:04.350', NULL, NULL, NULL, 0, 0, 3900, 1, 156000, 'ONLINE', NULL, 0),
(43, 'FZ013924', 'E2E Online Shopper', '01795698344', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'PENDING', '2026-07-03 02:46:14.404', '2026-07-03 02:46:15.113', NULL, NULL, NULL, 0, 0, 150, 1, 6000, 'PARTIAL', NULL, 0),
(44, 'FZ439035', 'E2E Online Shopper', '01776332931', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'CANCELLED', '2026-07-03 02:46:22.382', '2026-07-03 02:46:23.041', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'ONLINE', NULL, 0),
(45, 'E2E1783051310412180', 'E2E Admin Flow', '01748514225', 'E2E test address, Dhaka', 1, 6000, 150000, 156000, 'CONFIRMED', '2026-07-03 04:01:50.414', '2026-07-03 04:02:16.330', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(46, 'FZ083976', 'E2E Buy Now Shopper', '01774448482', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 80000, 86000, 'PENDING', '2026-07-03 04:02:31.673', '2026-07-03 04:02:31.673', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(47, 'FZ714571', 'E2E Guest Shopper', '01787850553', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'PENDING', '2026-07-03 04:03:01.819', '2026-07-03 04:03:01.819', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(48, 'FZ926538', 'E2E Racer B', '01730408110', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 99900, 105900, 'PENDING', '2026-07-03 04:03:13.657', '2026-07-03 04:03:13.657', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(49, 'FZ869164', 'E2E Online Shopper', '01749898331', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'PENDING', '2026-07-03 04:03:21.118', '2026-07-03 04:03:33.038', NULL, NULL, NULL, 0, 0, 3900, 1, 156000, 'ONLINE', NULL, 0),
(50, 'FZ538786', 'E2E Online Shopper', '01716279205', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'PENDING', '2026-07-03 04:03:44.672', '2026-07-03 04:03:45.150', NULL, NULL, NULL, 0, 0, 150, 1, 6000, 'PARTIAL', NULL, 0),
(51, 'FZ170277', 'E2E Online Shopper', '01781970960', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'CANCELLED', '2026-07-03 04:03:53.129', '2026-07-03 04:03:54.412', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'ONLINE', NULL, 0),
(52, 'FZ644818', 'E2E Coupon Shopper', '01774057415', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 146000, 'PENDING', '2026-07-03 04:10:43.789', '2026-07-03 04:10:43.822', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', 'E2E100', 10000),
(53, 'E2E1783076854184812', 'E2E Admin Flow', '01710172742', 'E2E test address, Dhaka', 1, 6000, 150000, 156000, 'CONFIRMED', '2026-07-03 11:07:34.188', '2026-07-03 11:08:25.347', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(54, 'FZ660873', 'E2E Buy Now Shopper', '01793561347', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 80000, 86000, 'PENDING', '2026-07-03 11:08:39.246', '2026-07-03 11:08:39.246', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(55, 'FZ829273', 'E2E Guest Shopper', '01705335748', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'PENDING', '2026-07-03 11:09:00.683', '2026-07-03 11:09:00.683', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(56, 'FZ482478', 'E2E Coupon Shopper', '01733525084', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 146000, 'PENDING', '2026-07-03 11:09:08.361', '2026-07-03 11:09:08.408', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', 'E2E100', 10000),
(57, 'FZ785220', 'E2E Racer B', '01736503960', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 99900, 105900, 'PENDING', '2026-07-03 11:09:30.352', '2026-07-03 11:09:30.352', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(58, 'FZ967577', 'E2E Online Shopper', '01725135290', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'PENDING', '2026-07-03 11:09:45.530', '2026-07-03 11:10:25.009', NULL, NULL, NULL, 0, 0, 3900, 1, 156000, 'ONLINE', NULL, 0),
(59, 'FZ894110', 'E2E Online Shopper', '01721358563', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'PENDING', '2026-07-03 11:10:48.912', '2026-07-03 11:10:50.392', NULL, NULL, NULL, 0, 0, 150, 1, 6000, 'PARTIAL', NULL, 0),
(60, 'FZ183695', 'E2E Online Shopper', '01714681023', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'CANCELLED', '2026-07-03 11:10:58.593', '2026-07-03 11:10:59.208', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'ONLINE', NULL, 0),
(61, 'FZ071177', 'E2E Online Shopper', '01727923113', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'PENDING', '2026-07-03 11:12:12.795', '2026-07-03 11:12:28.596', NULL, NULL, NULL, 0, 0, 3900, 1, 156000, 'ONLINE', NULL, 0),
(62, 'FZ866900', 'E2E Online Shopper', '01790079813', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'PENDING', '2026-07-03 11:14:30.704', '2026-07-03 11:14:59.580', NULL, NULL, NULL, 0, 0, 3900, 1, 156000, 'ONLINE', NULL, 0),
(63, 'FZ793692', 'E2E Online Shopper', '01788578032', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'PENDING', '2026-07-03 11:15:24.234', '2026-07-03 11:15:25.841', NULL, NULL, NULL, 0, 0, 150, 1, 6000, 'PARTIAL', NULL, 0),
(64, 'FZ941547', 'E2E Online Shopper', '01726241008', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'CANCELLED', '2026-07-03 11:15:35.409', '2026-07-03 11:15:36.910', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'ONLINE', NULL, 0),
(65, 'FZ746129', 'E2E Online Shopper', '01799400704', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'PENDING', '2026-07-03 11:17:20.597', '2026-07-03 11:17:37.731', NULL, NULL, NULL, 0, 0, 3900, 1, 156000, 'ONLINE', NULL, 0),
(66, 'E2E1783077507231236', 'E2E Admin Flow', '01716639608', 'E2E test address, Dhaka', 1, 6000, 150000, 156000, 'CONFIRMED', '2026-07-03 11:18:27.234', '2026-07-03 11:19:05.026', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(67, 'FZ697091', 'E2E Buy Now Shopper', '01721121113', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 80000, 86000, 'PENDING', '2026-07-03 11:19:26.427', '2026-07-03 11:19:26.427', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(68, 'FZ123398', 'E2E Guest Shopper', '01739028314', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'PENDING', '2026-07-03 11:20:15.184', '2026-07-03 11:20:15.184', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(69, 'FZ322385', 'E2E Coupon Shopper', '01757826433', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 146000, 'PENDING', '2026-07-03 11:20:31.563', '2026-07-03 11:20:32.185', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', 'E2E100', 10000),
(70, 'FZ366327', 'E2E Racer A', '01795215508', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 99900, 105900, 'PENDING', '2026-07-03 11:20:45.745', '2026-07-03 11:20:45.745', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'COD', NULL, 0),
(71, 'FZ804793', 'E2E Online Shopper', '01709414250', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'PENDING', '2026-07-03 11:20:53.136', '2026-07-03 11:21:01.938', NULL, NULL, NULL, 0, 0, 3900, 1, 156000, 'ONLINE', NULL, 0),
(72, 'FZ748896', 'E2E Online Shopper', '01718964302', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'PENDING', '2026-07-03 11:21:13.210', '2026-07-03 11:21:14.369', NULL, NULL, NULL, 0, 0, 150, 1, 6000, 'PARTIAL', NULL, 0),
(73, 'FZ763670', 'E2E Online Shopper', '01710042419', '12/A E2E Street, Test Area, Dhaka', 1, 6000, 150000, 156000, 'CANCELLED', '2026-07-03 11:21:25.483', '2026-07-03 11:21:26.465', NULL, NULL, NULL, 0, 0, 0, 1, 0, 'ONLINE', NULL, 0);

-- --------------------------------------------------------

--
-- Table structure for table `orderitem`
--

CREATE TABLE `orderitem` (
  `id` int(11) NOT NULL,
  `orderId` int(11) NOT NULL,
  `productId` int(11) DEFAULT NULL,
  `productName` varchar(191) NOT NULL,
  `unitPrice` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `variantId` int(11) DEFAULT NULL,
  `variantLabel` varchar(191) DEFAULT NULL,
  `purchaseCost` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `orderitem`
--

INSERT INTO `orderitem` (`id`, `orderId`, `productId`, `productName`, `unitPrice`, `quantity`, `variantId`, `variantLabel`, `purchaseCost`) VALUES
(9, 8, 1, 'Wireless Earbuds', 119900, 2, NULL, NULL, 0),
(10, 8, 2, 'USB-C Fast Charger', 80000, 1, NULL, NULL, 0),
(11, 10, 2, 'USB-C Fast Charger', 80000, 1, NULL, NULL, 0),
(12, 10, 4, 'Cotton Bed Sheet King Size', 99900, 1, NULL, NULL, 0),
(13, 11, 7, 'Pure Mustard Oil 1L — 1 Leter', 25000, 1, 1, '1 Leter', 0),
(14, 12, 6, 'Basmati Rice — 5 KG', 100000, 1, 14, '5 KG', 7500),
(15, 13, 6, 'Basmati Rice — 5 KG', 100000, 1, 14, '5 KG', 7500),
(16, 14, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(17, 15, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(18, 16, 11, 'E2E Buy Now Product', 80000, 1, NULL, NULL, 0),
(19, 17, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(20, 18, 12, 'E2E Oversell Product', 99900, 1, NULL, NULL, 0),
(21, 19, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(22, 20, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(23, 21, 11, 'E2E Buy Now Product', 80000, 1, NULL, NULL, 0),
(24, 22, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(25, 23, 12, 'E2E Oversell Product', 99900, 1, NULL, NULL, 0),
(26, 24, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(27, 25, 11, 'E2E Buy Now Product', 80000, 1, NULL, NULL, 0),
(28, 26, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(29, 27, 12, 'E2E Oversell Product', 99900, 1, NULL, NULL, 0),
(30, 28, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(31, 29, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(32, 30, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(33, 31, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(34, 32, 11, 'E2E Buy Now Product', 80000, 1, NULL, NULL, 0),
(35, 33, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(36, 34, 12, 'E2E Oversell Product', 99900, 1, NULL, NULL, 0),
(37, 35, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(38, 36, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(39, 37, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(40, 38, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(41, 39, 11, 'E2E Buy Now Product', 80000, 1, NULL, NULL, 0),
(42, 40, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(43, 41, 12, 'E2E Oversell Product', 99900, 1, NULL, NULL, 0),
(44, 42, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(45, 43, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(46, 44, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(47, 45, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(48, 46, 11, 'E2E Buy Now Product', 80000, 1, NULL, NULL, 0),
(49, 47, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(50, 48, 12, 'E2E Oversell Product', 99900, 1, NULL, NULL, 0),
(51, 49, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(52, 50, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(53, 51, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(54, 52, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(55, 53, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(56, 54, 11, 'E2E Buy Now Product', 80000, 1, NULL, NULL, 0),
(57, 55, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(58, 56, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(59, 57, 12, 'E2E Oversell Product', 99900, 1, NULL, NULL, 0),
(60, 58, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(61, 59, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(62, 60, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(63, 61, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(64, 62, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(65, 63, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(66, 64, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(67, 65, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(68, 66, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(69, 67, 11, 'E2E Buy Now Product', 80000, 1, NULL, NULL, 0),
(70, 68, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(71, 69, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(72, 70, 12, 'E2E Oversell Product', 99900, 1, NULL, NULL, 0),
(73, 71, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(74, 72, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0),
(75, 73, 10, 'E2E Checkout Product', 150000, 1, NULL, NULL, 0);

-- --------------------------------------------------------

--
-- Table structure for table `ordernote`
--

CREATE TABLE `ordernote` (
  `id` int(11) NOT NULL,
  `orderId` int(11) NOT NULL,
  `body` text NOT NULL,
  `author` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `orderstatuslog`
--

CREATE TABLE `orderstatuslog` (
  `id` int(11) NOT NULL,
  `orderId` int(11) NOT NULL,
  `fromStatus` enum('PENDING_PAYMENT','PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED','RETURNED') DEFAULT NULL,
  `toStatus` enum('PENDING_PAYMENT','PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED','RETURNED') NOT NULL,
  `changedBy` varchar(191) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `orderstatuslog`
--

INSERT INTO `orderstatuslog` (`id`, `orderId`, `fromStatus`, `toStatus`, `changedBy`, `note`, `createdAt`) VALUES
(4, 10, NULL, 'PENDING', NULL, NULL, '2026-06-25 12:45:49.579'),
(5, 10, 'PENDING', 'CONFIRMED', 'admin', NULL, '2026-06-25 12:49:01.896'),
(6, 10, 'CONFIRMED', 'CANCELLED', 'admin', NULL, '2026-06-25 12:49:06.394'),
(7, 11, NULL, 'PENDING', NULL, NULL, '2026-07-01 14:33:44.078'),
(8, 11, 'PENDING', 'CONFIRMED', 'admin', NULL, '2026-07-01 14:34:46.615'),
(9, 11, 'CONFIRMED', 'SHIPPED', 'admin', NULL, '2026-07-01 14:34:52.958'),
(10, 12, NULL, 'PENDING', NULL, NULL, '2026-07-02 13:04:20.809'),
(11, 12, 'PENDING', 'CONFIRMED', 'admin', NULL, '2026-07-02 13:05:03.723'),
(12, 12, 'CONFIRMED', 'SHIPPED', 'admin', NULL, '2026-07-02 13:05:06.050'),
(13, 12, 'SHIPPED', 'DELIVERED', 'admin', NULL, '2026-07-02 13:05:09.851'),
(14, 13, NULL, 'PENDING', NULL, NULL, '2026-07-02 13:07:07.885'),
(15, 13, 'PENDING', 'CONFIRMED', 'admin', NULL, '2026-07-02 13:07:17.351'),
(16, 13, 'CONFIRMED', 'SHIPPED', 'admin', NULL, '2026-07-02 13:07:20.781'),
(17, 13, 'SHIPPED', 'DELIVERED', 'admin', NULL, '2026-07-02 13:07:22.111'),
(18, 14, NULL, 'PENDING', NULL, NULL, '2026-07-02 17:00:04.160'),
(19, 15, NULL, 'PENDING', NULL, NULL, '2026-07-02 17:18:13.246'),
(20, 15, 'PENDING', 'CONFIRMED', 'e2e-admin', NULL, '2026-07-02 17:18:37.640'),
(21, 16, NULL, 'PENDING', NULL, NULL, '2026-07-02 17:18:50.743'),
(22, 17, NULL, 'PENDING', NULL, NULL, '2026-07-02 17:19:08.271'),
(23, 18, NULL, 'PENDING', NULL, NULL, '2026-07-02 17:19:23.901'),
(24, 19, NULL, 'PENDING', NULL, NULL, '2026-07-02 17:20:52.302'),
(25, 20, NULL, 'PENDING', NULL, NULL, '2026-07-02 17:24:14.701'),
(26, 20, 'PENDING', 'CONFIRMED', 'e2e-admin', NULL, '2026-07-02 17:24:36.766'),
(27, 21, NULL, 'PENDING', NULL, NULL, '2026-07-02 17:24:52.650'),
(28, 22, NULL, 'PENDING', NULL, NULL, '2026-07-02 17:25:21.529'),
(29, 23, NULL, 'PENDING', NULL, NULL, '2026-07-02 17:25:35.747'),
(30, 24, NULL, 'PENDING', NULL, NULL, '2026-07-02 18:20:06.055'),
(31, 24, 'PENDING', 'CONFIRMED', 'e2e-admin', NULL, '2026-07-02 18:20:40.963'),
(32, 25, NULL, 'PENDING', NULL, NULL, '2026-07-02 18:21:04.444'),
(33, 26, NULL, 'PENDING', NULL, NULL, '2026-07-02 18:21:23.573'),
(34, 27, NULL, 'PENDING', NULL, NULL, '2026-07-02 18:21:35.855'),
(35, 28, NULL, 'PENDING_PAYMENT', NULL, NULL, '2026-07-02 18:21:43.440'),
(36, 28, 'PENDING_PAYMENT', 'PENDING', NULL, NULL, '2026-07-02 18:21:53.842'),
(37, 29, NULL, 'PENDING_PAYMENT', NULL, NULL, '2026-07-02 18:22:05.072'),
(38, 29, 'PENDING_PAYMENT', 'PENDING', NULL, NULL, '2026-07-02 18:22:06.011'),
(39, 30, NULL, 'PENDING_PAYMENT', NULL, NULL, '2026-07-02 18:22:14.147'),
(40, 30, 'PENDING_PAYMENT', 'CANCELLED', NULL, NULL, '2026-07-02 18:22:14.816'),
(41, 31, NULL, 'PENDING', NULL, NULL, '2026-07-02 19:17:55.466'),
(42, 31, 'PENDING', 'CONFIRMED', 'e2e-admin', NULL, '2026-07-02 19:18:15.123'),
(43, 32, NULL, 'PENDING', NULL, NULL, '2026-07-02 19:18:27.652'),
(44, 33, NULL, 'PENDING', NULL, NULL, '2026-07-02 19:18:41.020'),
(45, 34, NULL, 'PENDING', NULL, NULL, '2026-07-02 19:18:50.823'),
(46, 35, NULL, 'PENDING_PAYMENT', NULL, NULL, '2026-07-02 19:18:57.391'),
(47, 35, 'PENDING_PAYMENT', 'PENDING', NULL, NULL, '2026-07-02 19:19:04.268'),
(48, 36, NULL, 'PENDING_PAYMENT', NULL, NULL, '2026-07-02 19:19:13.046'),
(49, 36, 'PENDING_PAYMENT', 'PENDING', NULL, NULL, '2026-07-02 19:19:13.693'),
(50, 37, NULL, 'PENDING_PAYMENT', NULL, NULL, '2026-07-02 19:19:20.784'),
(51, 37, 'PENDING_PAYMENT', 'CANCELLED', NULL, NULL, '2026-07-02 19:19:21.406'),
(52, 38, NULL, 'PENDING', NULL, NULL, '2026-07-03 02:44:08.237'),
(53, 38, 'PENDING', 'CONFIRMED', 'e2e-admin', NULL, '2026-07-03 02:44:39.828'),
(54, 39, NULL, 'PENDING', NULL, NULL, '2026-07-03 02:44:59.003'),
(55, 40, NULL, 'PENDING', NULL, NULL, '2026-07-03 02:45:29.554'),
(56, 41, NULL, 'PENDING', NULL, NULL, '2026-07-03 02:45:41.278'),
(57, 42, NULL, 'PENDING_PAYMENT', NULL, NULL, '2026-07-03 02:45:52.419'),
(58, 42, 'PENDING_PAYMENT', 'PENDING', NULL, NULL, '2026-07-03 02:46:04.348'),
(59, 43, NULL, 'PENDING_PAYMENT', NULL, NULL, '2026-07-03 02:46:14.404'),
(60, 43, 'PENDING_PAYMENT', 'PENDING', NULL, NULL, '2026-07-03 02:46:15.110'),
(61, 44, NULL, 'PENDING_PAYMENT', NULL, NULL, '2026-07-03 02:46:22.382'),
(62, 44, 'PENDING_PAYMENT', 'CANCELLED', NULL, NULL, '2026-07-03 02:46:23.046'),
(63, 45, NULL, 'PENDING', NULL, NULL, '2026-07-03 04:01:50.414'),
(64, 45, 'PENDING', 'CONFIRMED', 'e2e-admin', NULL, '2026-07-03 04:02:16.339'),
(65, 46, NULL, 'PENDING', NULL, NULL, '2026-07-03 04:02:31.673'),
(66, 47, NULL, 'PENDING', NULL, NULL, '2026-07-03 04:03:01.819'),
(67, 48, NULL, 'PENDING', NULL, NULL, '2026-07-03 04:03:13.657'),
(68, 49, NULL, 'PENDING_PAYMENT', NULL, NULL, '2026-07-03 04:03:21.118'),
(69, 49, 'PENDING_PAYMENT', 'PENDING', NULL, NULL, '2026-07-03 04:03:33.035'),
(70, 50, NULL, 'PENDING_PAYMENT', NULL, NULL, '2026-07-03 04:03:44.672'),
(71, 50, 'PENDING_PAYMENT', 'PENDING', NULL, NULL, '2026-07-03 04:03:45.148'),
(72, 51, NULL, 'PENDING_PAYMENT', NULL, NULL, '2026-07-03 04:03:53.129'),
(73, 51, 'PENDING_PAYMENT', 'CANCELLED', NULL, NULL, '2026-07-03 04:03:54.442'),
(74, 52, NULL, 'PENDING', NULL, NULL, '2026-07-03 04:10:43.789'),
(75, 53, NULL, 'PENDING', NULL, NULL, '2026-07-03 11:07:34.188'),
(76, 53, 'PENDING', 'CONFIRMED', 'e2e-admin', NULL, '2026-07-03 11:08:25.354'),
(77, 54, NULL, 'PENDING', NULL, NULL, '2026-07-03 11:08:39.246'),
(78, 55, NULL, 'PENDING', NULL, NULL, '2026-07-03 11:09:00.683'),
(79, 56, NULL, 'PENDING', NULL, NULL, '2026-07-03 11:09:08.361'),
(80, 57, NULL, 'PENDING', NULL, NULL, '2026-07-03 11:09:30.352'),
(81, 58, NULL, 'PENDING_PAYMENT', NULL, NULL, '2026-07-03 11:09:45.530'),
(82, 58, 'PENDING_PAYMENT', 'PENDING', NULL, NULL, '2026-07-03 11:10:25.006'),
(83, 59, NULL, 'PENDING_PAYMENT', NULL, NULL, '2026-07-03 11:10:48.912'),
(84, 59, 'PENDING_PAYMENT', 'PENDING', NULL, NULL, '2026-07-03 11:10:50.386'),
(85, 60, NULL, 'PENDING_PAYMENT', NULL, NULL, '2026-07-03 11:10:58.593'),
(86, 60, 'PENDING_PAYMENT', 'CANCELLED', NULL, NULL, '2026-07-03 11:10:59.223'),
(87, 61, NULL, 'PENDING_PAYMENT', NULL, NULL, '2026-07-03 11:12:12.795'),
(88, 61, 'PENDING_PAYMENT', 'PENDING', NULL, NULL, '2026-07-03 11:12:28.592'),
(89, 62, NULL, 'PENDING_PAYMENT', NULL, NULL, '2026-07-03 11:14:30.704'),
(90, 62, 'PENDING_PAYMENT', 'PENDING', NULL, NULL, '2026-07-03 11:14:59.576'),
(91, 63, NULL, 'PENDING_PAYMENT', NULL, NULL, '2026-07-03 11:15:24.234'),
(92, 63, 'PENDING_PAYMENT', 'PENDING', NULL, NULL, '2026-07-03 11:15:25.810'),
(93, 64, NULL, 'PENDING_PAYMENT', NULL, NULL, '2026-07-03 11:15:35.409'),
(94, 64, 'PENDING_PAYMENT', 'CANCELLED', NULL, NULL, '2026-07-03 11:15:36.915'),
(95, 65, NULL, 'PENDING_PAYMENT', NULL, NULL, '2026-07-03 11:17:20.597'),
(96, 65, 'PENDING_PAYMENT', 'PENDING', NULL, NULL, '2026-07-03 11:17:37.724'),
(97, 66, NULL, 'PENDING', NULL, NULL, '2026-07-03 11:18:27.234'),
(98, 66, 'PENDING', 'CONFIRMED', 'e2e-admin', NULL, '2026-07-03 11:19:05.037'),
(99, 67, NULL, 'PENDING', NULL, NULL, '2026-07-03 11:19:26.427'),
(100, 68, NULL, 'PENDING', NULL, NULL, '2026-07-03 11:20:15.184'),
(101, 69, NULL, 'PENDING', NULL, NULL, '2026-07-03 11:20:31.563'),
(102, 70, NULL, 'PENDING', NULL, NULL, '2026-07-03 11:20:45.745'),
(103, 71, NULL, 'PENDING_PAYMENT', NULL, NULL, '2026-07-03 11:20:53.136'),
(104, 71, 'PENDING_PAYMENT', 'PENDING', NULL, NULL, '2026-07-03 11:21:01.936'),
(105, 72, NULL, 'PENDING_PAYMENT', NULL, NULL, '2026-07-03 11:21:13.210'),
(106, 72, 'PENDING_PAYMENT', 'PENDING', NULL, NULL, '2026-07-03 11:21:14.362'),
(107, 73, NULL, 'PENDING_PAYMENT', NULL, NULL, '2026-07-03 11:21:25.483'),
(108, 73, 'PENDING_PAYMENT', 'CANCELLED', NULL, NULL, '2026-07-03 11:21:26.470');

-- --------------------------------------------------------

--
-- Table structure for table `page`
--

CREATE TABLE `page` (
  `id` int(11) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `content` text NOT NULL,
  `updatedAt` datetime(3) NOT NULL,
  `status` enum('PUBLISHED','DRAFT') NOT NULL DEFAULT 'PUBLISHED',
  `metaDescription` text DEFAULT NULL,
  `metaTitle` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `page`
--

INSERT INTO `page` (`id`, `slug`, `title`, `content`, `updatedAt`, `status`, `metaDescription`, `metaTitle`) VALUES
(1, 'about-us', 'About Us', '<h2>Welcome to FZ Mart</h2><p>FZ Mart is your trusted online shopping destination, bringing quality products from across every category right to your doorstep. From electronics and groceries to beauty, health, fashion, and everyday essentials — we make it simple to find what you need at prices you\'ll love.</p><h2>Our Story</h2><p>FZ Mart was founded with one simple goal: to make reliable, affordable online shopping available to everyone. What began as a small idea has grown into a full marketplace serving thousands of happy customers nationwide. We believe shopping should be easy, honest, and convenient — and that belief shapes everything we do.</p><h2>What We Offer</h2><ul><li><p>Wide selection: Thousands of products across electronics, home &amp; living, grocery, beauty, health, fashion, and more.</p></li><li><p>Genuine quality: Every item is sourced from trusted suppliers and checked before it reaches you.</p></li><li><p>Fair prices: Competitive pricing with regular discounts, flash sales, and special offers.</p></li><li><p>Cash on Delivery: Pay when your order arrives — shop with complete peace of mind.</p></li><li><p>Nationwide delivery: Fast, dependable shipping to your home, wherever you are.</p></li></ul><h2>Why Shop With Us</h2><p>We\'re committed to giving you a smooth and worry-free shopping experience. Our friendly support team is always ready to help, our return and refund policies are clear and fair, and your satisfaction is our top priority. When you shop at FZ Mart, you\'re not just buying a product — you\'re joining a community that values trust and service.</p><blockquote><p>Our mission is simple: quality products, honest prices, and service you can count on — every single time.</p></blockquote><h2>Get in Touch</h2><p>Have a question or need help with an order? We\'d love to hear from you. Visit our Contact Us page or reach out to our Support Center — we\'re here for you.</p><p>Thank you for choosing FZ Mart. Happy shopping!</p>', '2026-06-24 06:41:33.112', 'PUBLISHED', NULL, NULL),
(2, 'contact-us', 'Contact Us', '<h2>Get in Touch</h2><p>We\'re here to help! Whether you have a question about a product, an order, delivery, or anything else, the FZ Mart team is always happy to assist you. Reach out through any of the options below and we\'ll get back to you as quickly as possible.</p><h2>Customer Support</h2><h3>Phone </h3><p><strong>Call us: [+880 1721 821456]</strong></p><p><em>Available during business hours — see timings below.</em></p><h3>Email</h3><p><strong>Email us: [</strong><a target=\"_blank\" rel=\"noopener noreferrer nofollow\" href=\"mailto:support@fz-mart.com\"><strong>support@fz-mart.com</strong></a><strong>]</strong></p><p>We usually reply within 24 hours.</p><h3>WhatsApp</h3><p><strong>Message us: [+880 1XXX-XXXXXX]</strong></p><p>Quick replies for order and product questions.</p><h2>How We Can Help</h2><p></p><ul><li><p>- Questions about products, prices, or availability</p></li><li><p>- Help placing or changing an order</p></li><li><p>- Order status, tracking, and delivery updates</p></li><li><p>- Returns, refunds, and exchanges</p></li><li><p>- Payment or Cash on Delivery questions</p></li><li><p>- Any feedback or complaints</p></li></ul><h2>Business Hours ← H2</h2><p></p><ul><li><p>- Saturday – Thursday: 9:00 AM – 8:00 PM</p></li><li><p>- Friday: 3:00 PM – 8:00 PM</p></li><li><p>- Government holidays: Closed</p></li></ul><h2>Head Office</h2><p><strong>FZ Mart</strong></p><p>[Address line: street, area]</p><p>[City, Postal Code], Bangladesh</p><blockquote><p>Your satisfaction is our priority — don\'t hesitate to reach out. We\'d love to hear from you!</p></blockquote><p></p>', '2026-06-25 15:04:15.773', 'PUBLISHED', NULL, NULL),
(3, 'company-information', 'Company Information', '<p>FZ Mart is a trusted online retail company dedicated to bringing quality products and dependable service to customers across the country. We operate a full-range e-commerce marketplace covering electronics, groceries, home essentials, beauty, health, fashion, and much more — all backed by honest pricing and reliable delivery.</p><h2>Company Details </h2><p></p><ul><li><p><strong>-  Company Name: FZ Mart</strong></p></li><li><p><strong>-  Business Type: E-commerce / Online Retail</strong></p></li><li><p><strong>-  Founded: [Year]</strong></p></li><li><p><strong>-  Registration No.: [Company / Trade License Number]</strong></p></li><li><p><strong>-  Country of Operation: Bangladesh</strong></p></li></ul><p><em> All official registration details are kept up to date in accordance with local regulations.</em></p><h2>What We Do</h2><p></p><ul><li><p>- Operate a nationwide online shopping platform</p></li><li><p>- Source genuine products from trusted suppliers and brands</p></li><li><p>- Offer secure checkout with Cash on Delivery and other payment options</p></li><li><p>- Provide fast, reliable delivery across the country</p></li><li><p>- Deliver responsive customer support before and after every purchase</p></li></ul><h2>Our Commitment </h2><p>At FZ Mart, we believe a company is only as strong as the trust it earns. We are committed to transparency, fair pricing, genuine products, and treating every customer with honesty and respect. Our policies on returns, refunds, privacy, and data protection are designed to keep your interests protected at every step.</p><p></p><p><a target=\"_blank\" rel=\"noopener noreferrer nofollow\" href=\"http://localhost:3001/pages/terms-and-conditions\">- Read our Terms &amp; Conditions</a>   </p><p><a target=\"_blank\" rel=\"noopener noreferrer nofollow\" href=\"http://localhost:3001/pages/privacy-policy\">- Read our Privacy Policy   </a></p><h2>Registered Office </h2><p><strong>FZ Mart</strong></p><p>[Address line: street, area]</p><p>[City, Postal Code], Bangladesh</p><p><strong>Email: [</strong><a target=\"_blank\" rel=\"noopener noreferrer nofollow\" href=\"mailto:info@fz-mart.com\"><strong>info@fz-mart.com</strong></a><strong>] </strong></p><p>Phone: [+880 1721 821456]</p><p>For any business or partnership enquiries, please reach out through our <a target=\"_blank\" rel=\"noopener noreferrer nofollow\" href=\"http://localhost:3001/pages/contact-us\">Contact Us page</a>.   </p><blockquote><p> Built on trust, driven by service — that\'s the FZ Mart promise.</p></blockquote><p></p>', '2026-06-25 07:36:50.715', 'PUBLISHED', NULL, NULL),
(4, 'terms-and-conditions', 'Terms & Conditions', '<p><em>Please read these Terms &amp; Conditions carefully before using the FZ Mart website or placing an order. By using our website, you agree to be bound by these terms.</em></p><h2>1. Introduction  </h2><p>These Terms &amp; Conditions govern your use of the FZ Mart website and the purchase of any products from us. In these <strong>terms</strong>,  \"we\", \"us\", and \"our\" refer to <strong>FZ Mart</strong>, and  <strong>\"you\"</strong> refers to the customer or website visitor. If you do not agree with any part of these terms, please do not use our website.</p><h2>2. Use of Our Website  </h2><p>By using our website, you agree that:</p><p></p><ul><li><p>- You will provide accurate and complete information when placing an order</p></li><li><p>- You are responsible for keeping your account details secure (if you have an account)</p></li><li><p>- You will not use the website for any unlawful or fraudulent purpose</p></li><li><p>- You will not attempt to disrupt, damage, or gain unauthorized access to our systems</p></li></ul><h2>3. Products &amp; Pricing </h2><p></p><ul><li><p>- We make every effort to display products, prices, and descriptions accurately</p></li><li><p>- Prices are shown in Bangladeshi Taka and may change without prior notice</p></li><li><p>- Product images are for illustration; slight variations may occur</p></li><li><p>- We reserve the right to limit quantities, correct errors, or cancel an order if a pricing or product error is found</p></li></ul><h2>4. Orders &amp; Confirmation </h2><ul><li><p>- Placing an order is an offer to purchase, which we may accept or decline</p></li><li><p>- We may contact you to confirm your order before processing it</p></li><li><p>- We reserve the right to refuse or cancel any order at our discretion, including cases of suspected fraud or stock unavailability</p></li></ul><h2>5. Payment   ← H2</h2><p>We accept<strong> Cash on Delivery</strong> and other payment methods shown at checkout. Full payment details are explained on our Payment page. </p><h2>6. Shipping &amp; Delivery  </h2><p>Delivery times and charges vary by location. Please refer to our Shipping page for full details. We are not responsible for delays caused by circumstances beyond our control.   </p><h2><strong>7. Returns, Refunds &amp; Cancellations </strong></h2><p>Returns, refunds, and cancellations are handled in line with our Refund Policy. Please review it for full details on eligibility and process.   </p><h2><strong>8. Privacy  </strong></h2><p>Your privacy is important to us. Our handling of your personal information is explained in our Privacy Policy.  </p><h2>9. Limitation of Liability  </h2><p>To the fullest extent permitted by law, FZ Mart shall not be liable for any indirect or consequential loss arising from the use of our website or products, except as required under applicable consumer protection law.</p><h2>10. Changes to These Terms   ← H2</h2><p>We may update these Terms &amp; Conditions from time to time. Any changes take effect once published on this page. Your continued use of the website means you accept the updated terms.</p><h2>11. Governing Law   ← H2</h2><p>These Terms &amp; Conditions are governed by the laws of <strong>Bangladesh</strong>, and any disputes shall be subject to the jurisdiction of its courts.</p><h2>12. Contact Us   ← H2</h2><p>If you have any questions about these Terms &amp; Conditions, please reach out through our<a target=\"_blank\" rel=\"noopener noreferrer nofollow\" href=\"http://localhost:3000/pages/contact-us\"> Contact Us page</a>. </p><p>By using FZ Mart and placing an order, you confirm that you have read, understood, and agreed to these Terms &amp; Conditions.</p><p></p>', '2026-06-24 09:47:28.372', 'PUBLISHED', NULL, NULL),
(5, 'privacy-policy', 'Privacy Policy', '<p><em> Your privacy matters to us. This Privacy Policy explains what information we collect, how we use it, and how we keep it safe when you use the FZ Mart website.</em></p><h2>1. Introduction</h2><p>FZ Mart <strong>we</strong> is committed to protecting your privacy. By using our website and placing an order, you agree to the collection and use of your information as described in this policy. Please read it carefully to understand our practices.</p><h2>2. Information We Collect </h2><h3>Information You Provide ← H3</h3><p></p><ul><li><p>- Your name, phone number, and delivery address when you place an order</p></li><li><p>- Your email address, if you provide one or sign in by email</p></li><li><p>- Any messages or details you share with our support team</p></li></ul><h3>Information Collected Automatically</h3><p></p><ul><li><p>- Basic device and browser information</p></li><li><p>- Pages you visit and how you use our website</p></li><li><p>- Cookies and similar technologies that help the site function</p></li></ul><h2>3. How We Use Your Information</h2><p>We use your information to:</p><p></p><ul><li><p>- Process, confirm, and deliver your orders</p></li><li><p>- Contact you about your order or delivery</p></li><li><p>- Provide customer support and respond to your questions</p></li><li><p>- Improve our website, products, and services</p></li><li><p>- Send updates or offers, where you have agreed to receive them</p></li><li><p>- Prevent fraud and keep our platform secure</p></li></ul><h2>4. How We Share Your Information</h2><p>We do not sell your personal information. We only share it when necessary to run our service, such as:</p><p></p><ul><li><p>- With delivery partners, to ship your order to you</p></li><li><p>- With service providers who help operate our website (for example, payment or messaging services)</p></li><li><p>- When required by law, or to protect our rights and the safety of others</p></li></ul><h2>5. Cookies ← H2</h2><p>Our website uses cookies to keep your cart working, remember your preferences, and understand how the site is used. You can control or disable cookies through your browser settings, though some features may not work properly without them.</p><h2>6. Data Security</h2><p>We take reasonable steps to protect your personal information from loss, misuse, or unauthorized access. However, no method of online transmission is completely secure, and we cannot guarantee absolute security.</p><h2>7. Your Rights</h2><p>You may:</p><p></p><ul><li><p>- Ask what personal information we hold about you</p></li><li><p>- Request that we correct inaccurate information</p></li><li><p>- Request that we delete your information, where allowed by law</p></li><li><p>- Opt out of promotional messages at any time</p></li></ul><h2>8. Children\'s Privacy</h2><p>Our website is not intended for children under the age of [18]. We do not knowingly collect personal information from children. If you believe a child has provided us information, please contact us so we can remove it.</p><h2>9. Changes to This Policy</h2><p>We may update this Privacy Policy from time to time. Any changes take effect once published on this page, with the date updated accordingly. We encourage you to review it periodically.</p><h2>10. Contact Us</h2><p>If you have any questions about this Privacy Policy or how we handle your information, please reach out through our Contact Us page or email us at [<a target=\"_blank\" rel=\"noopener noreferrer nofollow\" href=\"mailto:privacy@fz-mart.com\">privacy@fz-mart.com</a>]. ← link \"Contact Us\" to /pages/contact-us, and make the email a link</p><p>For more about using our website, please also see our Terms &amp; Conditions. ← link to /pages/terms-and-conditions</p><blockquote><p>We\'re committed to keeping your personal information safe and using it responsibly — always.</p></blockquote><p></p>', '2026-06-27 05:40:05.329', 'PUBLISHED', NULL, NULL),
(6, 'support-center', 'Support Center', '<h2>How Can We Help? </h2><p>Welcome to the FZ Mart Support Center. We\'re committed to making your shopping experience smooth and worry-free. Below you\'ll find quick answers and helpful links for the most common questions. If you can\'t find what you\'re looking for, our support team is just a message away.</p><h2>Popular Help Topics  </h2><p></p><ul><li><p>- How to Order — a simple step-by-step guide to placing your order</p></li><li><p>- Order Tracking — check where your order is right now</p></li><li><p>- Shipping &amp; Delivery — delivery times, zones, and charges</p></li><li><p>- Returns &amp; Refunds — how to return an item and get your money back</p></li><li><p>- Payment Options — accepted payment methods and Cash on Delivery</p></li></ul><h2>Track Your Order </h2><p>Want to know where your order is? You can check your order status anytime.</p><p></p><ul><li><p>- Go to the <a target=\"_blank\" rel=\"noopener noreferrer nofollow\" href=\"http://localhost:3001/pages/order-tracking\">Order Tracking page</a>  </p></li><li><p>- Enter your order number (sent to you when you placed the order)</p></li><li><p>- View your latest delivery status</p></li></ul><p><em> If your tracking hasn\'t updated for a while, please contact us and we\'ll check it for you.</em></p><h2>Returns &amp; Refunds </h2><p>We want you to be fully happy with your purchase. If something isn\'t right, we\'re here to make it easy.</p><p></p><ul><li><p>- Returns are accepted within the period stated in our Refund Policy   ← link to /pages/refund-policy</p></li><li><p>- The item must be unused and in its original packaging</p></li><li><p>- Once approved, your refund is processed promptly</p></li></ul><h2>Payment &amp; Delivery   ← H2</h2><h3>Payment  </h3><p><strong>We accept: Cash on Delivery and other supported methods shown at checkout. Pay safely and only when your order is confirmed.</strong></p><h3>Delivery </h3><p><strong> Nationwide shipping: Fast and reliable delivery to your doorstep. Delivery time and charges depend on your location.</strong></p><h2>Still Need Help?</h2><p>Our friendly support team is ready to assist you.</p><p><strong>Phone: [+880 1721 821456]</strong></p><p><strong>Email: [</strong><a target=\"_blank\" rel=\"noopener noreferrer nofollow\" href=\"mailto:support@fz-mart.com\"><strong>support@fz-mart.com</strong></a><strong>] </strong></p><p><strong>Hours: Saturday – Thursday, 9:00 AM – 8:00 PM</strong></p><p>You can also visit our <a target=\"_blank\" rel=\"noopener noreferrer nofollow\" href=\"http://localhost:3001/pages/contact-us\">Contact Us page</a> to send us a message.   </p><blockquote><p>We\'re always here for you — your satisfaction is our top priority.</p></blockquote><p></p>', '2026-06-25 07:41:58.136', 'PUBLISHED', NULL, NULL),
(7, 'how-to-order', 'How to Order', '<p>Shopping at FZ Mart is quick and easy. Just follow the simple steps below to place your order and have your products delivered right to your doorstep. No complicated process — only a few clicks from cart to checkout.</p><p><em>You can place an order as a guest or while signed in — whatever is most convenient for you.</em></p><h2>Step-by-Step Ordering Guide </h2><h3>Step 1: Browse Products</h3><p>Explore our categories or use the search bar to find what you need. Click any product to view its details, price, available colors, and description.</p><h3>Step 2: Add to Cart </h3><p>Once you\'ve found a product you like, choose your quantity and click the  <strong>Add to Cart </strong>button. You can keep shopping and add more items, or proceed straight away.</p><h3>Step 3: Review Your Cart </h3><p>Open your cart to check the items, quantities, and total. You can update quantities or remove items here before continuing.</p><h3>Step 4: Checkout </h3><p>Click <strong>Checkout</strong> Now and enter your delivery details — name, phone number, and full address. Please make sure your phone number is correct so we can confirm your order.</p><h3>Step 5: Choose Payment &amp; Place Order </h3><p>Select your payment method — including  <strong>Cash on Delivery</strong> — and confirm your order. You\'ll receive an order number once it\'s placed successfully.</p><h2>Payment Options</h2><p></p><ul><li><p>- Cash on Delivery — pay when your order arrives at your door</p></li><li><p>- Other payment methods shown at checkout, where available</p></li></ul><p>For full details, see our Payment page.   ← link \"Payment page\" to /pages/payment</p><h2>After You Order </h2><p></p><ul><li><p>- You\'ll receive an order number to confirm your purchase</p></li><li><p>- Our team may call to confirm your order before shipping</p></li><li><p>- You can follow your delivery anytime on the Order Tracking page   ← link to /pages/order-tracking</p></li><li><p>- Delivery times and charges depend on your location — see our Shipping page   ← link \"Shipping page\" to /pages/shipping</p></li></ul><h2>Need Help?</h2><p>If you have any trouble placing an order, our support team is happy to help. Just visit our Contact Us page and we\'ll guide you through it.   ← link \"Contact Us\" to /pages/contact-us</p><blockquote><p>[Ordering made simple — from cart to doorstep, we\'ve got you covered.]</p></blockquote><p></p>', '2026-06-25 06:41:13.222', 'PUBLISHED', NULL, NULL),
(8, 'order-tracking', 'Order Tracking', 'Explain how customers can track their order here.', '2026-06-22 07:24:06.852', 'PUBLISHED', NULL, NULL),
(9, 'payment', 'Payment', 'Explain accepted payment methods here.', '2026-06-22 07:24:06.856', 'PUBLISHED', NULL, NULL),
(10, 'shipping', 'Shipping', '<p>At FZ Mart, we deliver nationwide and work hard to get your order to you quickly and safely. This page explains our shipping zones, delivery charges, and how long delivery usually takes, so you always know what to expect after placing an order.</p><p><em>Delivery charges and times are estimates and may vary depending on your location and product availability.</em></p><h2><strong>Shipping Zones &amp; Charges  </strong></h2><p>Your delivery charge depends on where you live. We divide the country into the following zones:</p><h3>Inside [Dhaka City]  </h3><p><strong> Delivery Charge: [৳60]</strong></p><p><strong> Delivery Time: [1–2] working days</strong></p><h3>Around [Dhaka / Suburbs]  </h3><p><strong>Delivery Charge: [৳100]</strong></p><p><strong>Delivery Time: [2–3] working days</strong></p><h3>Outside [Dhaka / Nationwide]  </h3><p><strong>Delivery Charge: [৳120]</strong></p><p><strong>Delivery Time: [3–5] working days</strong></p><p><em>The exact zone and delivery charge for your address are shown at checkout before you confirm your order.</em></p><h2>Delivery Times </h2><p></p><ul><li><p>- Orders are usually processed within [24 hours] of confirmation</p></li><li><p>- Delivery time starts once your order is confirmed, not when it is placed</p></li><li><p>- You may receive a confirmation call before your order is shipped</p></li><li><p>- Delivery may take longer during holidays, festivals, sales, or situations beyond our control</p></li></ul><h2>Cash on Delivery  </h2><p>We offer  <strong>Cash on Delivery</strong> across most zones — simply pay the delivery person when your order arrives. Please keep the exact amount ready for a smooth, quick handover.</p><h2>Tracking Your Order </h2><p>You can follow your order\'s progress at any time on our Order Tracking page using your order number.   ← link \"Order Tracking\" to /pages/order-tracking</p><h2>Important Notes </h2><p></p><ul><li><p>- Please provide a complete, correct delivery address and a working phone number</p></li><li><p>- Make sure someone is available to receive the order at the delivery address</p></li><li><p>- If delivery fails due to a wrong address or no response, re-delivery may take extra time or charges</p></li><li><p>- For damaged or incorrect items on arrival, please see our Refund Policy   ← link \"Refund Policy\" to /pages/refund-policy</p></li></ul><h2>Need Help?   ← H2</h2><p>Have a question about delivery to your area? Reach out through our Contact Us page — we\'re happy to help.   ← link \"Contact Us\" to /pages/contact-us</p><blockquote><p>Fast, safe, and reliable delivery — right to your doorstep, in every zone we serve.</p></blockquote><p></p>', '2026-06-27 06:09:40.417', 'PUBLISHED', NULL, NULL),
(11, 'happy-return', 'Happy Return', 'Explain your happy return policy here.', '2026-06-22 07:51:55.547', 'PUBLISHED', NULL, NULL),
(12, 'refund-policy', 'Refund Policy', 'Explain your refund policy here.', '2026-06-22 07:51:55.552', 'PUBLISHED', NULL, NULL),
(13, 'exchange', 'Exchange', '<p>Product Exchange Policy   ← H2</p><p>We want you to be completely happy with every purchase from FZ Mart. If a product isn\'t quite right, our exchange policy makes it easy to swap it for the correct size, color, or a different item. Please read the details below so you know exactly how it works.</p><p>[Italic:] Exchange requests must be made within [3–7] days of receiving your order.</p><p>When You Can Exchange   ← H2</p><p>You can request an exchange if:</p><p>[Bullet list:]</p><p>- The item is [Bold:] unused, unworn, and in its original condition</p><p>- It is returned with all original packaging, tags, and accessories</p><p>- You received a wrong, damaged, or defective product</p><p>- You need a different size, color, or variant (subject to availability)</p><p>- The request is made within the [Bold:] exchange period stated above</p><p>What Cannot Be Exchanged   ← H2</p><p>For hygiene and safety reasons, some items cannot be exchanged:</p><p>[Bullet list:]</p><p>- Used, washed, or damaged items (unless faulty on arrival)</p><p>- Personal care, beauty, and hygiene products once opened</p><p>- Perishable goods and grocery items</p><p>- Items marked as \"non-exchangeable\" or final sale</p><p>- Products missing original packaging, tags, or accessories</p><p>How to Request an Exchange   ← H2</p><p>[Bullet list:]</p><p>- Contact our support team within the exchange period   ← link \"Contact our support team\" to /pages/contact-us</p><p>- Share your order number and the reason for the exchange</p><p>- Our team will confirm whether the item is eligible</p><p>- Pack the item securely in its original packaging</p><p>- Hand it over for pickup or return as instructed, and we\'ll arrange the replacement</p><p>Exchange Charges   ← H2</p><p>[Bullet list:]</p><p>- If you received a wrong, damaged, or defective item, the exchange is [Bold:] free of charge</p><p>- For exchanges due to a change of mind (size/color/variant), delivery charges may apply</p><p>- Any charges will be communicated to you clearly before the exchange is processed</p><p>- Exchanges are subject to stock availability; if a replacement isn\'t available, see our Refund Policy   ← link \"Refund Policy\" to /pages/refund-policy</p><p>Exchange vs. Return   ← H2</p><p>If you\'d prefer your money back instead of a replacement, please see our Happy Return and Refund Policy pages for how returns and refunds work.   ← link \"Happy Return\" to /pages/happy-return and \"Refund Policy\" to /pages/refund-policy</p><p>Need Help?   ← H2</p><p>Have a question about exchanging an item? Our support team is happy to guide you. Just reach out through our Contact Us page.   ← link \"Contact Us\" to /pages/contact-us</p><p>[Quote:] Got the wrong item? No worries — we\'ll make it right with a quick and easy exchange.</p><p></p>', '2026-06-27 05:49:49.015', 'PUBLISHED', NULL, NULL),
(14, 'cancellation', 'Cancellation', '<p>Order Cancellation Policy   ← H2</p><p>We understand that plans change. If you need to cancel your order, FZ Mart makes the process simple. This page explains when you can cancel, how to do it, and what happens next.</p><p>[Italic:] Orders can usually be cancelled before they are shipped — please request cancellation as early as possible.</p><p>When You Can Cancel   ← H2</p><p>[Bullet list:]</p><p>- Before your order is confirmed or shipped — cancellation is quick and free</p><p>- If the item is out of stock or delayed beyond the expected time</p><p>- If you were charged an incorrect amount or ordered by mistake</p><p>When Cancellation May Not Be Possible   ← H2</p><p>[Bullet list:]</p><p>- After your order has already been [Bold:] shipped or is out for delivery</p><p>- For certain items marked as non-cancellable or final sale</p><p>- For perishable goods and grocery items once preparation has begun</p><p>- For custom or special pre-order items already processed   ← link \"pre-order\" to /pages/pre-order</p><p>How to Cancel Your Order   ← H2</p><p>[Bullet list:]</p><p>- Contact our support team as soon as possible   ← link \"Contact our support team\" to /pages/contact-us</p><p>- Share your order number and the reason for cancellation</p><p>- Our team will confirm whether your order is still eligible to cancel</p><p>- Once approved, you\'ll receive a cancellation confirmation</p><p>You can also check your order\'s current status anytime on our Order Tracking page.   ← link \"Order Tracking\" to /pages/order-tracking</p><p>Refunds for Cancelled Orders   ← H2</p><p></p><ul><li><p>- For [Bold:] Cash on Delivery orders, no payment is taken, so nothing needs to be refunded</p></li><li><p>- If you made any advance or online payment, it will be refunded under our Refund Policy   ← link \"Refund Policy\" to /pages/refund-policy</p></li><li><p>- Refunds are processed promptly once the cancellation is confirmed</p></li></ul><h2>Cancellation by FZ Mart  </h2><p>In some cases, we may need to cancel an order — for example, if an item is unavailable, a pricing error occurred, or the order could not be verified. If this happens, we\'ll inform you and fully refund any payment already made.</p><h2>Need Help?</h2><p>Have a question about cancelling an order? Our support team is happy to help — just reach out through our <a target=\"_blank\" rel=\"noopener noreferrer nofollow\" href=\"http://localhost:3000/pages/contact-us\">Contact Us page.</a>   </p><blockquote><p>Changed your mind? Cancelling with FZ Mart is quick, easy, and hassle-free.</p></blockquote><p></p>', '2026-06-27 05:58:56.600', 'PUBLISHED', NULL, NULL),
(15, 'pre-order', 'Pre-Order', '<p>What is Pre-Order?   ← H2</p><p>A [Bold:] Pre-Order lets you reserve a product before it\'s available in stock. Some items are in high demand or arriving soon, and pre-ordering guarantees that one is set aside for you — so you don\'t miss out when it becomes available.</p><p>[Italic:] Pre-order delivery dates are estimates and may shift slightly depending on supply.</p><p>How Pre-Order Works   ← H2</p><p>[Bullet list:]</p><p>- Products available for pre-order are clearly marked</p><p>- Place your pre-order just like a normal order, with your delivery details</p><p>- We reserve the item for you and prepare it for delivery once it arrives in stock</p><p>- You\'ll be notified and the item is delivered around its estimated delivery date</p><p>For the general ordering steps, see our How to Order page.   ← link \"How to Order\" to /pages/how-to-order</p><p>Payment for Pre-Orders   ← H2</p><p>[Bullet list:]</p><p>- Pre-orders can be placed using [Bold:] Cash on Delivery or the payment methods shown at checkout</p><p>- For Cash on Delivery, you pay when the item is delivered to you</p><p>- If any advance payment is required for a specific item, it will be clearly stated before you confirm</p><p>Delivery &amp; Timing   ← H2</p><p>[Bullet list:]</p><p>- Each pre-order product shows an [Bold:] estimated delivery date or timeframe</p><p>- Delivery begins once the item is in stock and your order is confirmed</p><p>- Estimated dates may change due to supplier or shipping delays beyond our control</p><p>- We\'ll keep you informed if the timeline changes significantly</p><p>Delivery charges and zones are the same as regular orders — see our Shipping page for details.   ← link \"Shipping page\" to /pages/shipping</p><p>Cancellations &amp; Refunds   ← H2</p><p>[Bullet list:]</p><p>- You may cancel a pre-order before it ships if you change your mind</p><p>- If you paid any advance and cancel, it is handled under our Refund Policy   ← link \"Refund Policy\" to /pages/refund-policy</p><p>- We may cancel a pre-order if the item becomes permanently unavailable, with any advance fully refunded</p><p>Need Help?   ← H2</p><p>Have a question about a pre-order item or its expected arrival? Our support team is happy to help — just reach out through our Contact Us page.   ← link \"Contact Us\" to /pages/contact-us</p><p>[Quote:] Reserve today, receive it first — pre-order with FZ Mart and never miss out.</p><p></p>', '2026-06-27 05:49:23.696', 'PUBLISHED', NULL, NULL),
(16, 'extra-discount', 'Extra Discount', '<p>Extra Discounts at FZ Mart   ← H2</p><p>At FZ Mart, great prices are only the beginning. We regularly run extra discounts, flash sales, and special offers so you can save even more on the products you love. This page explains the different ways you can save when you shop with us.</p><p>[Italic:] Offers are limited-time and may change at any time, so grab them while they last!</p><p>Current Ways to Save   ← H2</p><p>Flash Sales   ← H3</p><p>For a limited time, selected products are available at deeper, time-boxed prices during our [Bold:] Flash Sales. Once the timer runs out, the price returns to normal — so be quick.</p><p>Promo Badges   ← H3</p><p>Look out for special badges like [Bold:] \"Best Seller\", \"New\", or \"Discount\" on product cards. These highlight items with special pricing or popular deals.</p><p>Discounted Prices   ← H3</p><p>Many products already show a [Bold:] discounted price next to the original price, so you can see your savings at a glance before you buy.</p><p>Seasonal &amp; Festival Offers   ← H3</p><p>During special seasons and festivals, we run extra promotions across many categories. Keep an eye on the homepage for the latest deals.</p><p>How to Get Your Discount   ← H2</p><p>[Bullet list:]</p><p>- Browse the homepage and product pages for discounted items and flash sales</p><p>- Add discounted products to your cart as usual</p><p>- The discounted price is applied automatically — no code needed unless stated</p><p>- Complete checkout to lock in your savings</p><p>You can start shopping our latest deals on the Products page.   ← link \"Products page\" to /products</p><p>Terms of Use   ← H2</p><p>[Bullet list:]</p><p>- Discounts apply only while the offer is active and stocks last</p><p>- Offers cannot be exchanged for cash and may not be combined unless stated</p><p>- Prices and discounts may change without prior notice</p><p>- FZ Mart reserves the right to modify or end any offer at any time</p><p>- In case of any dispute, FZ Mart\'s decision will be final</p><p>Stay Updated   ← H2</p><p>Don\'t want to miss a deal? Check back often, and make sure your contact details are up to date so we can let you know about upcoming offers. For any questions about a discount, please reach out through our Contact Us page.   ← link \"Contact Us\" to /pages/contact-us</p><p>[Quote:] More savings, more reasons to smile — shop smart with FZ Mart.</p><p></p>', '2026-06-27 05:44:43.012', 'PUBLISHED', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `passwordresettoken`
--

CREATE TABLE `passwordresettoken` (
  `id` int(11) NOT NULL,
  `adminId` int(11) NOT NULL,
  `token` varchar(191) NOT NULL,
  `expiresAt` datetime(3) NOT NULL,
  `usedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `passwordresettoken`
--

INSERT INTO `passwordresettoken` (`id`, `adminId`, `token`, `expiresAt`, `usedAt`, `createdAt`) VALUES
(1, 1, 'abfeb7a45b7912559137a851aca3258d5c777c777d12e50675516baaf987fe46', '2026-07-02 15:20:18.130', '2026-07-02 14:51:05.688', '2026-07-02 14:50:18.131'),
(2, 3, 'b626a79815454d855921aae16ce4ed9d79a41187f294dad2840a4f10729083b2', '2026-07-04 12:20:11.512', NULL, '2026-07-03 12:20:11.514');

-- --------------------------------------------------------

--
-- Table structure for table `payment`
--

CREATE TABLE `payment` (
  `id` int(11) NOT NULL,
  `orderId` int(11) NOT NULL,
  `provider` varchar(191) NOT NULL,
  `amount` int(11) NOT NULL,
  `status` enum('INITIATED','SUCCESS','FAILED','REFUNDED') NOT NULL DEFAULT 'INITIATED',
  `providerTxnId` varchar(191) DEFAULT NULL,
  `rawPayload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`rawPayload`)),
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `payment`
--

INSERT INTO `payment` (`id`, `orderId`, `provider`, `amount`, `status`, `providerTxnId`, `rawPayload`, `createdAt`, `updatedAt`) VALUES
(1, 28, 'mock', 156000, 'SUCCESS', 'MOCK-1-1783016513815', '{\"paymentId\":\"1\",\"amount\":\"156000\",\"outcome\":\"success\"}', '2026-07-02 18:21:43.504', '2026-07-02 18:21:53.832'),
(2, 29, 'mock', 6000, 'SUCCESS', 'MOCK-2-1783016525984', '{\"paymentId\":\"2\",\"amount\":\"6000\",\"outcome\":\"success\"}', '2026-07-02 18:22:05.080', '2026-07-02 18:22:05.995'),
(3, 30, 'mock', 156000, 'FAILED', NULL, '{\"paymentId\":\"3\",\"amount\":\"156000\",\"outcome\":\"failed\"}', '2026-07-02 18:22:14.160', '2026-07-02 18:22:14.799'),
(4, 35, 'mock', 156000, 'SUCCESS', 'MOCK-4-1783019944250', '{\"paymentId\":\"4\",\"amount\":\"156000\",\"outcome\":\"success\"}', '2026-07-02 19:18:57.400', '2026-07-02 19:19:04.259'),
(5, 36, 'mock', 6000, 'SUCCESS', 'MOCK-5-1783019953670', '{\"paymentId\":\"5\",\"amount\":\"6000\",\"outcome\":\"success\"}', '2026-07-02 19:19:13.059', '2026-07-02 19:19:13.687'),
(6, 37, 'mock', 156000, 'FAILED', NULL, '{\"paymentId\":\"6\",\"amount\":\"156000\",\"outcome\":\"failed\"}', '2026-07-02 19:19:20.796', '2026-07-02 19:19:21.393'),
(7, 42, 'mock', 156000, 'SUCCESS', 'MOCK-7-1783046764326', '{\"paymentId\":\"7\",\"amount\":\"156000\",\"outcome\":\"success\"}', '2026-07-03 02:45:52.733', '2026-07-03 02:46:04.336'),
(8, 43, 'mock', 6000, 'SUCCESS', 'MOCK-8-1783046775067', '{\"paymentId\":\"8\",\"amount\":\"6000\",\"outcome\":\"success\"}', '2026-07-03 02:46:14.413', '2026-07-03 02:46:15.094'),
(9, 44, 'mock', 156000, 'FAILED', NULL, '{\"paymentId\":\"9\",\"amount\":\"156000\",\"outcome\":\"failed\"}', '2026-07-03 02:46:22.440', '2026-07-03 02:46:23.034'),
(10, 49, 'mock', 156000, 'SUCCESS', 'MOCK-10-1783051413015', '{\"paymentId\":\"10\",\"amount\":\"156000\",\"outcome\":\"success\"}', '2026-07-03 04:03:21.156', '2026-07-03 04:03:33.025'),
(11, 50, 'mock', 6000, 'SUCCESS', 'MOCK-11-1783051425111', '{\"paymentId\":\"11\",\"amount\":\"6000\",\"outcome\":\"success\"}', '2026-07-03 04:03:44.680', '2026-07-03 04:03:45.135'),
(12, 51, 'mock', 156000, 'FAILED', NULL, '{\"paymentId\":\"12\",\"amount\":\"156000\",\"outcome\":\"failed\"}', '2026-07-03 04:03:53.200', '2026-07-03 04:03:54.322'),
(13, 58, 'mock', 156000, 'SUCCESS', 'MOCK-13-1783077024981', '{\"paymentId\":\"13\",\"amount\":\"156000\",\"outcome\":\"success\"}', '2026-07-03 11:09:45.546', '2026-07-03 11:10:24.995'),
(14, 59, 'mock', 6000, 'SUCCESS', 'MOCK-14-1783077049985', '{\"paymentId\":\"14\",\"amount\":\"6000\",\"outcome\":\"success\"}', '2026-07-03 11:10:48.919', '2026-07-03 11:10:50.274'),
(15, 60, 'mock', 156000, 'FAILED', NULL, '{\"paymentId\":\"15\",\"amount\":\"156000\",\"outcome\":\"failed\"}', '2026-07-03 11:10:58.646', '2026-07-03 11:10:59.198'),
(16, 61, 'mock', 156000, 'SUCCESS', 'MOCK-16-1783077148569', '{\"paymentId\":\"16\",\"amount\":\"156000\",\"outcome\":\"success\"}', '2026-07-03 11:12:12.829', '2026-07-03 11:12:28.583'),
(17, 62, 'mock', 156000, 'SUCCESS', 'MOCK-17-1783077299531', '{\"paymentId\":\"17\",\"amount\":\"156000\",\"outcome\":\"success\"}', '2026-07-03 11:14:30.720', '2026-07-03 11:14:59.554'),
(18, 63, 'mock', 6000, 'SUCCESS', 'MOCK-18-1783077325646', '{\"paymentId\":\"18\",\"amount\":\"6000\",\"outcome\":\"success\"}', '2026-07-03 11:15:24.254', '2026-07-03 11:15:25.752'),
(19, 64, 'mock', 156000, 'FAILED', NULL, '{\"paymentId\":\"19\",\"amount\":\"156000\",\"outcome\":\"failed\"}', '2026-07-03 11:15:35.423', '2026-07-03 11:15:36.901'),
(20, 65, 'mock', 156000, 'SUCCESS', 'MOCK-20-1783077457706', '{\"paymentId\":\"20\",\"amount\":\"156000\",\"outcome\":\"success\"}', '2026-07-03 11:17:20.604', '2026-07-03 11:17:37.719'),
(21, 71, 'mock', 156000, 'SUCCESS', 'MOCK-21-1783077661920', '{\"paymentId\":\"21\",\"amount\":\"156000\",\"outcome\":\"success\"}', '2026-07-03 11:20:53.188', '2026-07-03 11:21:01.928'),
(22, 72, 'mock', 6000, 'SUCCESS', 'MOCK-22-1783077674342', '{\"paymentId\":\"22\",\"amount\":\"6000\",\"outcome\":\"success\"}', '2026-07-03 11:21:13.219', '2026-07-03 11:21:14.352'),
(23, 73, 'mock', 156000, 'FAILED', NULL, '{\"paymentId\":\"23\",\"amount\":\"156000\",\"outcome\":\"failed\"}', '2026-07-03 11:21:25.503', '2026-07-03 11:21:26.455');

-- --------------------------------------------------------

--
-- Table structure for table `product`
--

CREATE TABLE `product` (
  `id` int(11) NOT NULL,
  `subcategoryId` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `description` text DEFAULT NULL,
  `price` int(11) NOT NULL,
  `discountPrice` int(11) DEFAULT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `isFeatured` tinyint(1) NOT NULL DEFAULT 0,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `promoBadge` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `purchaseCost` int(11) NOT NULL DEFAULT 0,
  `metaDescription` text DEFAULT NULL,
  `metaTitle` varchar(191) DEFAULT NULL,
  `lowStockThreshold` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `product`
--

INSERT INTO `product` (`id`, `subcategoryId`, `name`, `slug`, `description`, `price`, `discountPrice`, `stock`, `isFeatured`, `status`, `promoBadge`, `createdAt`, `updatedAt`, `purchaseCost`, `metaDescription`, `metaTitle`, `lowStockThreshold`) VALUES
(1, 1, 'Wireless Earbuds', 'wireless-earbuds', 'Bluetooth 5.3 earbuds with charging case.', 150000, 119900, 50, 1, 'ACTIVE', 'Best Seller', '2026-06-21 11:57:38.298', '2026-06-22 07:51:55.499', 0, NULL, NULL, 0),
(2, 1, 'USB-C Fast Charger', 'usb-c-fast-charger', '20W PD fast charger, compact design.', 80000, NULL, 119, 1, 'ACTIVE', NULL, '2026-06-21 11:57:38.315', '2026-06-25 12:45:49.571', 0, NULL, NULL, 0),
(3, 1, 'Braided USB-C Cable', 'braided-usb-c-cable', '1m durable braided cable, 60W rated.Durable 1.5m braided USB-C charging cable, supports fast charging', 35000, 29900, 50, 0, 'ACTIVE', 'Best Seller', '2026-06-21 11:57:38.340', '2026-06-23 05:58:15.033', 0, NULL, NULL, 0),
(4, 4, 'Cotton Bed Sheet King Size', 'cotton-bed-sheet-king-size', '100% cotton 200 thread count king size bed sheet, soft and breathable', 120000, 99900, 39, 1, 'ACTIVE', NULL, '2026-06-23 06:00:37.874', '2026-06-25 12:45:49.575', 0, NULL, NULL, 0),
(5, 4, 'Ceramic Mug Set (6pcs)', 'ceramic-mug-set-6pcs', 'Premium ceramic mugs, microwave and dishwasher safe, 300ml each', 25000, 22000, 80, 0, 'ACTIVE', NULL, '2026-06-23 06:08:05.460', '2026-07-01 14:36:13.030', 0, NULL, NULL, 0),
(6, 6, 'Basmati Rice', 'basmati-rice', 'Premium long-grain basmati rice, aromatic and fluffy when cooked', 12000, 11500, 200, 0, 'ACTIVE', NULL, '2026-06-23 06:09:22.476', '2026-07-02 13:04:02.978', 7500, NULL, NULL, 0),
(7, 7, 'Pure Mustard Oil 1L', 'pure-mustard-oil-1l', 'Cold-pressed pure mustard oil, ideal for cooking and skin care', 22000, NULL, 150, 1, 'ACTIVE', NULL, '2026-06-23 06:10:42.988', '2026-06-30 14:27:38.592', 0, NULL, NULL, 0),
(8, 9, 'Aloe Vera Moisturizer Gel', 'aloe-vera-moisturizer-gel', 'Beauty Formulas Aloe Vera gel produced from organic Aloe vera to maximise the benefits of the Aloe Vera Barbadensis plant. Grown in a warm tropical climate, Aloe vera is known to have long-standing all-purpose benefits for the skin such as a soothing anti-inflammatory effect to calm and cool the skin. Moisturising and cooling relief for dry, rough, irritated, sun-exposed skin. Restores, repairs and stimulates skin renewal for a vitalising effect. Suitable for all skin types.', 29900, 24900, 90, 0, 'ACTIVE', 'New', '2026-06-23 06:13:15.022', '2026-06-30 13:43:18.120', 0, NULL, NULL, 0),
(9, 11, 'NexusLink 3-in-1 Premium Braided Multi-Charging Cable (USB-C, Lightning, Micro-USB) – Metallic Orange', 'nexuslink-3-in-1-premium-braided-multi-charging-cable-usb-c-lightning-micro-usb-metallic-orange', 'Tired of cluttering your desk and tangling your bag with multiple cords? Simplify your charging setup with our 3-in-1 Premium Braided Multi-Charging Cable. Featuring three different connectors branching from a single, high-efficiency USB-A power source, this is the ultimate all-in-one charging solution for your tech arsenal.\r\n\r\nAs showcased in lucian-alexe-yh0UtueiZ-I-unsplash.jpg, this cable features a vibrant, eye-catching metallic orange finish paired with a durable braided jacket, ensuring you', 50000, 35000, 200, 0, 'ACTIVE', NULL, '2026-06-30 08:41:09.176', '2026-06-30 09:34:10.689', 0, NULL, NULL, 0),
(10, 27, 'E2E Checkout Product', 'e2e-checkout-product', 'Automated test product — safe to delete.', 150000, NULL, 46, 0, 'ACTIVE', NULL, '2026-07-02 16:59:58.017', '2026-07-03 11:21:26.479', 0, NULL, NULL, 0),
(11, 27, 'E2E Buy Now Product', 'e2e-buynow-product', 'Automated test product — safe to delete.', 80000, NULL, 49, 0, 'ACTIVE', NULL, '2026-07-02 16:59:58.037', '2026-07-03 11:19:26.416', 0, NULL, NULL, 0),
(12, 27, 'E2E Oversell Product', 'e2e-oversell-product', 'Automated test product — safe to delete.', 99900, NULL, 0, 0, 'ACTIVE', NULL, '2026-07-02 16:59:58.053', '2026-07-03 11:20:45.740', 0, NULL, NULL, 0);

-- --------------------------------------------------------

--
-- Table structure for table `productcolor`
--

CREATE TABLE `productcolor` (
  `id` int(11) NOT NULL,
  `productId` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `hexCode` varchar(191) NOT NULL,
  `imageUrl` varchar(191) DEFAULT NULL,
  `sortOrder` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `productcolor`
--

INSERT INTO `productcolor` (`id`, `productId`, `name`, `hexCode`, `imageUrl`, `sortOrder`) VALUES
(3, 9, 'red', '#d70000', NULL, 0),
(4, 9, 'orange', '#fc541e', NULL, 1),
(5, 9, 'pink', '#ea79a5', NULL, 2);

-- --------------------------------------------------------

--
-- Table structure for table `productfeature`
--

CREATE TABLE `productfeature` (
  `id` int(11) NOT NULL,
  `productId` int(11) NOT NULL,
  `text` varchar(191) NOT NULL,
  `sortOrder` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `productfeature`
--

INSERT INTO `productfeature` (`id`, `productId`, `text`, `sortOrder`) VALUES
(5, 9, 'Universal Compatibility: Seamlessly charge almost any device on the market. It includes USB Type-C, Lightning (iOS), and Micro-USB connectors.', 0),
(6, 9, 'Heavy-Duty Braided Nylon: Engineered to withstand daily wear and tear. The reinforced nylon braiding prevents fraying, tangling, and bending damage.', 1),
(7, 9, 'Premium Aluminum Shells: The connectors are housed in sleek, heat-resistant aluminum alloy casings that offer superior protection and a premium feel.', 2),
(8, 9, 'Simultaneous Charging: Power up your smartphone, tablet, and wireless earbuds all at the same time from a single wall adapter or power bank.', 3);

-- --------------------------------------------------------

--
-- Table structure for table `productimage`
--

CREATE TABLE `productimage` (
  `id` int(11) NOT NULL,
  `productId` int(11) NOT NULL,
  `url` varchar(191) NOT NULL,
  `isPrimary` tinyint(1) NOT NULL DEFAULT 0,
  `sortOrder` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `productimage`
--

INSERT INTO `productimage` (`id`, `productId`, `url`, `isPrimary`, `sortOrder`) VALUES
(1, 1, '/placeholder.svg', 1, 0),
(2, 2, '/placeholder.svg', 1, 0),
(4, 3, 'https://placehold.co/400x400?text=USB-C+Cable', 1, 0),
(6, 4, 'https://placehold.co/400x400?text=Bed+Sheet', 1, 0),
(14, 9, '/uploads/products/1782808513976-e3e03251-f88b-4eb3-8c90-34c018e34274.jpg', 1, 0),
(15, 9, '/uploads/products/1782808494848-85a369ca-db51-44c6-b51f-6453cc97e7e8.jpg', 0, 1),
(16, 9, '/uploads/products/1782808545350-942a22bb-6e46-46ee-afca-d17b9fd0c27a.jpg', 0, 2),
(17, 8, '/uploads/products/1782826881140-3bcd5f91-a8ba-42ba-9f2d-f0e38c498e7d.jpg', 1, 0),
(18, 8, '/uploads/products/1782826917735-1cbcb7f7-db0b-4115-9f19-df42358a86b1.jpg', 0, 1),
(19, 8, '/uploads/products/1782826943359-5e03c839-0f81-4643-8792-f41ca65e233a.jpg', 0, 2),
(22, 7, '/uploads/products/1782827286269-5aaf6024-baf4-415c-b4bc-2714c5eef995.jpg', 1, 0),
(23, 7, '/uploads/products/1782827372692-b53104b8-7799-43f5-a03e-4933473684bb.jpg', 0, 1),
(37, 5, '/uploads/products/1782915628474-a64856e4-afe6-47d4-b4ef-707608f019ba.jpg', 1, 0),
(38, 5, '/uploads/products/1782915648171-51fa4aa2-103d-47a5-94f0-07277c74bf11.jpg', 0, 1),
(42, 6, '/uploads/products/1782830045406-4f16ee9a-c1e2-4226-a4d5-3fb249195acf.jpg', 1, 0),
(43, 6, '/uploads/products/1782830072941-e35264b6-4df8-415a-b675-7521dd02fe8b.jpg', 0, 1),
(44, 6, '/uploads/products/1782830082399-1b93e897-01fb-4341-b533-41a3cfbf5a60.jpg', 0, 2),
(45, 10, '/placeholder.svg', 1, 0),
(46, 11, '/placeholder.svg', 1, 0),
(47, 12, '/placeholder.svg', 1, 0);

-- --------------------------------------------------------

--
-- Table structure for table `productreview`
--

CREATE TABLE `productreview` (
  `id` int(11) NOT NULL,
  `productId` int(11) NOT NULL,
  `customerId` varchar(191) NOT NULL,
  `rating` int(11) NOT NULL,
  `comment` text NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `status` enum('PENDING','APPROVED','HIDDEN') NOT NULL DEFAULT 'PENDING'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `productreview`
--

INSERT INTO `productreview` (`id`, `productId`, `customerId`, `rating`, `comment`, `createdAt`, `status`) VALUES
(1, 6, 'fz-01C796', 5, 'rice was Good', '2026-06-25 11:38:08.126', 'APPROVED'),
(2, 6, 'fz-9D3FE2', 4, 'it was GooD But there is no smell', '2026-06-25 11:53:02.851', 'HIDDEN'),
(3, 7, 'fz-65B7A6', 4, 'this oil was good but price was high , i think', '2026-06-27 05:15:26.997', 'PENDING'),
(4, 1, 'fz-65B7A6', 5, 'sound quality was too good, 1 month use it later reviewed it, this price range it was good product', '2026-06-27 05:19:47.488', 'HIDDEN'),
(5, 7, 'fz-01C796', 5, 'it great oil', '2026-07-01 14:37:12.734', 'APPROVED');

-- --------------------------------------------------------

--
-- Table structure for table `productspecification`
--

CREATE TABLE `productspecification` (
  `id` int(11) NOT NULL,
  `productId` int(11) NOT NULL,
  `label` varchar(191) NOT NULL,
  `value` varchar(191) NOT NULL,
  `sortOrder` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `productvariant`
--

CREATE TABLE `productvariant` (
  `id` int(11) NOT NULL,
  `productId` int(11) NOT NULL,
  `size` varchar(191) DEFAULT NULL,
  `price` int(11) NOT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `sortOrder` int(11) NOT NULL DEFAULT 0,
  `colorName` varchar(191) DEFAULT NULL,
  `purchaseCost` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `productvariant`
--

INSERT INTO `productvariant` (`id`, `productId`, `size`, `price`, `stock`, `sortOrder`, `colorName`, `purchaseCost`) VALUES
(1, 7, '1 Leter', 25000, 299, 0, NULL, 0),
(2, 7, '5 Leter', 125000, 200, 1, NULL, 0),
(9, 5, '6 pcs', 22000, 80, 0, NULL, 0),
(10, 5, '12 pcs', 44000, 120, 1, NULL, 0),
(13, 6, '1 KG', 20000, 500, 0, NULL, 0),
(14, 6, '5 KG', 100000, 298, 1, NULL, 0);

-- --------------------------------------------------------

--
-- Table structure for table `returnrequest`
--

CREATE TABLE `returnrequest` (
  `id` int(11) NOT NULL,
  `orderId` int(11) NOT NULL,
  `customerId` varchar(191) DEFAULT NULL,
  `reason` text NOT NULL,
  `photoUrl` varchar(191) DEFAULT NULL,
  `status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `adminNote` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `setting`
--

CREATE TABLE `setting` (
  `id` int(11) NOT NULL,
  `group` varchar(191) NOT NULL,
  `key` varchar(191) NOT NULL,
  `value` text NOT NULL,
  `isEncrypted` tinyint(1) NOT NULL DEFAULT 0,
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `setting`
--

INSERT INTO `setting` (`id`, `group`, `key`, `value`, `isEncrypted`, `updatedAt`) VALUES
(1, 'tracking', 'gtmId', '', 0, '2026-06-21 15:49:03.132'),
(2, 'tracking', 'pixelId', '', 0, '2026-06-21 15:49:03.137'),
(33, 'courier', 'webhookSecret', 'Aw3FpEWCUH9eJaWq.redKLw718LBRQ3QLwoSSdw==.S9oNaCklzmufaSw=', 1, '2026-06-23 08:43:23.758'),
(34, 'courier', 'provider', 'Test Courier', 0, '2026-06-23 08:43:23.758'),
(35, 'courier', 'apiUrl', '', 0, '2026-06-23 08:43:23.758'),
(36, 'courier', 'apiKey', 'QLLY9EssZWU3wj/c.bMXyAKA2z2lmrsb8XgWzlg==.hV2ZdLgAJ18=', 1, '2026-06-23 08:43:23.758'),
(37, 'smtp', 'port', '587', 0, '2026-06-24 10:20:11.122'),
(38, 'smtp', 'host', 'smtp.gmail.com', 0, '2026-06-24 10:20:11.122'),
(39, 'smtp', 'user', 'no.one3059@gmail.com', 0, '2026-06-24 10:20:11.122'),
(40, 'smtp', 'fromAddress', 'no.one3059@gmail.com', 0, '2026-06-24 10:20:11.122'),
(41, 'smtp', 'fromName', 'fz-mart', 0, '2026-06-24 10:20:11.122'),
(42, 'smtp', 'password', 'KLJ/MrwryiutnfUv.8XFmCkOKUiEc+mDPKtYGcw==.2iqJx0M/X0t0O7tTyBDdhUptiA==', 1, '2026-06-24 10:20:11.122'),
(43, 'smtp', 'secure', 'false', 0, '2026-06-24 10:20:11.122'),
(44, 'google_oauth', 'clientSecret', 'QvqcO1TcSt8GDsF6.VxW2VvL3UwSLVX5Hy9ub8Q==.PTgc9mKaUvnd/U/3uumIaedEMsbrc29B0BYqfJUarUTW73I=', 1, '2026-06-24 11:10:30.112'),
(45, 'google_oauth', 'clientId', '189700913412-l6uejevnf7dig9u50tc12j6ir12ktqin.apps.googleusercontent.com', 0, '2026-06-24 11:10:30.112'),
(46, 'google_oauth', 'redirectUri', 'http://localhost:3000/login/google/callback', 0, '2026-06-24 11:10:30.112'),
(47, 'theme', 'brandDark', '#a21caf', 0, '2026-06-28 09:09:57.831'),
(48, 'theme', 'brand', '#c026d3', 0, '2026-06-28 09:09:57.831'),
(49, 'theme', 'brandTint2', '#f3c4f9', 0, '2026-06-28 09:09:57.832'),
(50, 'theme', 'brandTint', '#fbe9fe', 0, '2026-06-28 09:09:57.832'),
(51, 'payments', 'onlineEnabled', 'true', 0, '2026-07-03 11:18:25.425'),
(52, 'payments', 'partialEnabled', 'true', 0, '2026-07-03 11:18:25.430'),
(53, 'payments', 'mockEnabled', 'true', 0, '2026-07-03 11:18:25.435'),
(54, 'payments', 'mockFeeBps', '250', 0, '2026-07-03 11:18:25.439'),
(55, 'payments', 'sslcommerzEnabled', 'false', 0, '2026-07-03 11:18:25.443'),
(56, 'payments', 'bkashEnabled', 'false', 0, '2026-07-03 11:18:25.447'),
(57, 'feeds', 'token', 'a4689d6596df2cbc869a9c42b75648e33b7b4efbb1388ad5', 0, '2026-07-02 19:01:37.044'),
(58, 'conversion', 'whatsappNumber', '', 0, '2026-07-03 04:12:28.067'),
(59, 'localization', 'banglaDigits', 'false', 0, '2026-07-03 12:17:56.749'),
(60, 'localization', 'defaultLocale', 'bn', 0, '2026-07-03 12:17:56.749');

-- --------------------------------------------------------

--
-- Table structure for table `shippingzone`
--

CREATE TABLE `shippingzone` (
  `id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `charge` int(11) NOT NULL DEFAULT 0,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `sortOrder` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `shippingzone`
--

INSERT INTO `shippingzone` (`id`, `name`, `charge`, `isActive`, `sortOrder`, `createdAt`) VALUES
(1, 'Inside Dhaka', 6000, 1, 0, '2026-06-21 11:57:38.264'),
(2, 'Outside Dhaka', 12000, 1, 1, '2026-06-21 11:57:38.273'),
(3, 'Jamalpur', 15000, 0, 2, '2026-06-24 11:16:17.049');

-- --------------------------------------------------------

--
-- Table structure for table `smslog`
--

CREATE TABLE `smslog` (
  `id` int(11) NOT NULL,
  `to` varchar(191) NOT NULL,
  `template` varchar(191) NOT NULL,
  `status` enum('PENDING','SENT','FAILED') NOT NULL DEFAULT 'PENDING',
  `error` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `smslog`
--

INSERT INTO `smslog` (`id`, `to`, `template`, `status`, `error`, `createdAt`) VALUES
(6, '01856247747', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-06-24 10:28:13.311'),
(7, '01856247747', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-06-24 10:28:15.424'),
(8, '01856247747', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-06-24 10:28:19.528'),
(9, '01721821456', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-06-25 12:49:02.003'),
(10, '01721821456', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-06-25 12:49:04.111'),
(11, '01721821456', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-06-25 12:49:06.406'),
(12, '01721821456', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-06-25 12:49:08.226'),
(13, '01721821456', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-06-25 12:49:08.440'),
(14, '01721821456', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-06-25 12:49:12.529'),
(15, '01856247747', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 14:42:30.434'),
(16, '01856247747', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 14:42:30.482'),
(17, '01856247747', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 14:42:30.501'),
(18, '01856247747', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 14:42:30.536'),
(19, '01856247747', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 14:42:30.556'),
(20, '01856247747', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 14:42:30.566'),
(21, '01856247747', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 14:42:30.578'),
(22, '01856247747', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 14:42:30.619'),
(23, '01856247747', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 14:42:32.553'),
(24, '01856247747', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 14:42:32.607'),
(25, '01856247747', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 14:42:32.615'),
(26, '01856247747', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 14:42:32.631'),
(27, '01856247747', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 14:42:32.638'),
(28, '01856247747', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 14:42:32.647'),
(29, '01856247747', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 14:42:32.658'),
(30, '01856247747', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 14:42:32.668'),
(31, '01856247747', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 14:42:36.708'),
(32, '01856247747', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 14:42:36.725'),
(33, '01856247747', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 14:42:36.733'),
(34, '01856247747', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 14:42:36.744'),
(35, '01856247747', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 14:42:36.752'),
(36, '01856247747', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 14:42:36.759'),
(37, '01856247747', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 14:42:36.768'),
(38, '01856247747', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 14:42:36.775'),
(39, '01743069349', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 17:18:38.088'),
(40, '01743069349', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 17:18:40.160'),
(41, '01743069349', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 17:18:44.328'),
(42, '01788586360', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 17:24:37.015'),
(43, '01788586360', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 17:24:39.254'),
(44, '01788586360', 'order-status', 'FAILED', 'SMS gateway is not configured — set it under Admin > Settings > SMS.', '2026-07-02 17:24:43.373');

-- --------------------------------------------------------

--
-- Table structure for table `stockadjustment`
--

CREATE TABLE `stockadjustment` (
  `id` int(11) NOT NULL,
  `productId` int(11) NOT NULL,
  `variantId` int(11) DEFAULT NULL,
  `delta` int(11) NOT NULL,
  `newStock` int(11) NOT NULL,
  `reason` varchar(191) NOT NULL,
  `adminName` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stocknotification`
--

CREATE TABLE `stocknotification` (
  `id` int(11) NOT NULL,
  `productId` int(11) NOT NULL,
  `variantId` int(11) DEFAULT NULL,
  `email` varchar(191) DEFAULT NULL,
  `phone` varchar(191) DEFAULT NULL,
  `customerId` varchar(191) DEFAULT NULL,
  `notifiedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `subcategory`
--

CREATE TABLE `subcategory` (
  `id` int(11) NOT NULL,
  `categoryId` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `sortOrder` int(11) NOT NULL DEFAULT 0,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `subcategory`
--

INSERT INTO `subcategory` (`id`, `categoryId`, `name`, `slug`, `sortOrder`, `isActive`, `createdAt`, `updatedAt`) VALUES
(1, 1, 'Accessories', 'accessories', 0, 1, '2026-06-21 11:57:38.290', '2026-06-21 11:57:38.290'),
(2, 2, 'T-shairt', 't-shairt', 0, 1, '2026-06-22 13:33:04.847', '2026-06-22 13:33:04.847'),
(3, 3, 'Furniture', 'furniture', 0, 1, '2026-06-23 05:50:00.229', '2026-06-23 05:50:00.229'),
(4, 3, 'Kitchen', 'kitchen', 0, 1, '2026-06-23 05:50:08.049', '2026-06-23 05:50:08.049'),
(5, 3, 'Bedding', 'bedding', 0, 1, '2026-06-23 05:50:14.155', '2026-06-23 05:50:14.155'),
(6, 4, 'Rice & Grains', 'rice-grains', 0, 1, '2026-06-23 05:50:24.139', '2026-06-23 05:50:24.139'),
(7, 4, 'Oil & Ghee', 'oil-ghee', 0, 1, '2026-06-23 05:50:30.961', '2026-06-23 05:50:30.961'),
(8, 4, 'Snacks', 'snacks', 0, 1, '2026-06-23 05:50:37.063', '2026-06-23 05:50:37.063'),
(9, 5, 'Skin Care', 'skin-care', 0, 1, '2026-06-23 05:50:44.180', '2026-06-23 05:50:44.180'),
(10, 5, 'Hair Care', 'hair-care', 0, 1, '2026-06-23 05:50:51.851', '2026-06-23 05:50:51.851'),
(11, 6, 'Chargers & Cables', 'chargers-cables', 0, 1, '2026-06-23 05:51:03.202', '2026-06-23 05:51:03.202'),
(12, 6, 'Phone Cases', 'phone-cases', 0, 1, '2026-06-23 05:51:11.238', '2026-06-23 05:51:11.238'),
(13, 7, 'Vitamins', 'vitamins', 0, 1, '2026-06-23 05:51:20.789', '2026-06-23 05:51:20.789'),
(14, 7, 'Medical Devices', 'medical-devices', 0, 1, '2026-06-23 05:51:33.712', '2026-06-23 05:51:33.712'),
(15, 8, 'Fitness Equipment', 'fitness-equipment', 0, 1, '2026-06-23 05:53:32.141', '2026-06-23 05:53:32.141'),
(16, 8, 'Outdoor Sports', 'outdoor-sports', 0, 1, '2026-06-23 05:53:39.098', '2026-06-23 05:53:39.098'),
(17, 9, 'Toys', 'toys', 0, 1, '2026-06-23 05:53:45.141', '2026-06-23 05:53:45.141'),
(18, 9, 'Baby Care', 'baby-care', 0, 1, '2026-06-23 05:53:51.719', '2026-06-23 05:53:51.719'),
(19, 10, 'Academic', 'academic', 0, 1, '2026-06-23 05:53:59.424', '2026-06-23 05:53:59.424'),
(20, 10, 'Fiction', 'fiction', 0, 1, '2026-06-23 05:54:05.049', '2026-06-23 05:54:05.049'),
(21, 11, 'Car Accessories', 'car-accessories', 0, 1, '2026-06-23 05:54:15.830', '2026-06-23 05:54:15.830'),
(22, 11, 'Cleaning & Care', 'cleaning-care', 0, 1, '2026-06-23 05:54:23.483', '2026-06-23 05:54:23.483'),
(23, 12, 'Pens & Pencils', 'pens-pencils', 0, 1, '2026-06-23 05:54:32.295', '2026-06-23 05:54:32.295'),
(24, 12, 'Notebooks', 'notebooks', 0, 1, '2026-06-23 05:54:37.563', '2026-06-23 05:54:37.563'),
(25, 2, 'Pants', 'pants', 0, 1, '2026-06-23 05:54:47.109', '2026-06-23 05:54:47.109'),
(26, 2, 'Shoes', 'shoes', 0, 1, '2026-06-23 05:54:56.314', '2026-06-23 05:54:56.314'),
(27, 13, 'E2E Tests Sub', 'e2e-tests-sub', 99, 1, '2026-07-02 16:59:58.007', '2026-07-02 16:59:58.007');

-- --------------------------------------------------------

--
-- Table structure for table `wishlistitem`
--

CREATE TABLE `wishlistitem` (
  `id` int(11) NOT NULL,
  `customerId` varchar(191) NOT NULL,
  `productId` int(11) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `_prisma_migrations`
--

CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) NOT NULL,
  `checksum` varchar(64) NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) NOT NULL,
  `logs` text DEFAULT NULL,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `applied_steps_count` int(10) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `_prisma_migrations`
--

INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `logs`, `rolled_back_at`, `started_at`, `applied_steps_count`) VALUES
('0e33a2b2-ddd4-44d6-abfa-221218c5861c', 'dcbbd441ec9f8bd001a0dd06d6e270dd5ad09e912e401a094e60afbd6be3c30b', '2026-07-01 17:27:44.496', '20260701093000_customer_id_drop_literal_six', NULL, NULL, '2026-07-01 17:27:44.342', 1),
('10450ef7-189b-4134-89d3-da15016f85a1', '3d9f121aa42eaa232027ec38d1e3f19dee8f14e75aa30fe67b18828fd94dc43f', '2026-06-21 11:39:11.749', '20260621113911_init', NULL, NULL, '2026-06-21 11:39:11.108', 1),
('16641509-71be-4af0-8cd0-29a864eb2acc', 'dd7df1580faa01668800749cdf7fba3e906adcec58e6efe412b47f52d8e3c9c5', '2026-07-02 19:43:01.518', '20260703090000_add_rbac_2fa_audit', NULL, NULL, '2026-07-02 19:43:01.371', 1),
('39af23ff-8daf-4685-b522-5bb842ff0bf9', '1753d922d3fb286f76defe201ccb4b189087bedc0878dffcabde28691bcb55dd', '2026-06-23 08:08:31.944', '20260623080831_add_page_status', NULL, NULL, '2026-06-23 08:08:31.932', 1),
('4c8f981c-6b12-4c5b-bc11-b727022cac09', 'd289b28fcb15a593f573c7ef8451a1cfd055b4767a2a9a5951dc8d20dd0941be', '2026-07-02 17:45:51.168', '20260702174550_add_payments', NULL, NULL, '2026-07-02 17:45:50.925', 1),
('5096e61c-5866-477f-bf43-af514e58f42b', '8cff3fc54ba0b5bcf7f623c369189374f5b295db1b03be7bae927987840f23cc', '2026-07-03 07:30:20.331', '20260703140000_add_inventory', NULL, NULL, '2026-07-03 07:30:19.985', 1),
('52682994-1ca0-43d0-b6ad-4947d1c3cd44', 'd2125401975f5a59b2e83aab5b7c0fa6f7181905d9e61c6e738ed073b9926090', '2026-06-21 18:15:51.044', '20260621181550_add_courier_fraud', NULL, NULL, '2026-06-21 18:15:50.934', 1),
('5e700168-865b-4be9-a8b3-924a1b9f14dd', '4b9aec9491a9d1e047a24eb5bc355a000a5558c2d2d3f569501fa2053d422252', '2026-07-02 18:35:18.638', '20260702183518_add_search_and_seo', NULL, NULL, '2026-07-02 18:35:18.404', 1),
('6179438c-b70e-44d7-92ac-990b8e177c88', '4909b7f99fd3b9994c465bbda940853f21d25326e9a5abfca9431d1b69f9a4ef', '2026-06-22 13:40:05.036', '20260622134004_add_flash_sale', NULL, NULL, '2026-06-22 13:40:04.870', 1),
('6826c7f5-9bbc-43f7-9493-389e7f2bb66c', '7c531800c7898dc0da253863c0522969cab9c68e4a9cb729ce773c77d11ec0ba', '2026-06-21 16:03:14.340', '20260621160314_add_mail_sms_logs', NULL, NULL, '2026-06-21 16:03:14.268', 1),
('6f741ef4-6b81-4ec0-a51e-6beb4ae918e0', '52cd5e51aed43b1266ea231feb8e2f91494b91a3084fd798bd42ab647681dfd8', '2026-06-22 07:20:28.458', '20260622072028_add_faq_and_support_pages', NULL, NULL, '2026-06-22 07:20:28.430', 1),
('772d23e5-bd93-46d2-a56a-542752d1f312', '59b11fbdab3ef03a2bfdc0540518658045de537a6cdacf80dac61933b3834b72', '2026-06-22 05:32:16.607', '20260622053216_add_page_model', NULL, NULL, '2026-06-22 05:32:16.561', 1),
('7d50b001-76fd-46cb-b187-7f6332f6ba76', '187d012c27292ca992fe2d047ed7527fee53353e2ef543e53afff55db5384786', '2026-06-24 05:36:38.335', '20260624053637_add_customers_reviews_colors_specs_features', NULL, NULL, '2026-06-24 05:36:37.858', 1),
('86e2eec2-efff-4512-a0d0-3a8088def241', '59439521321c655e3f69792491b0b79a0c53124633d2acf0482850b2372bb587', '2026-06-21 15:36:33.750', '20260621153633_add_blocked_ip', NULL, NULL, '2026-06-21 15:36:33.714', 1),
('8cb29d33-3844-4a48-8d21-a007dfd33457', '18226f3d5dc840e17e41dd8e8828e3c9b176e1d9d8798cfa2191cee936db0081', '2026-06-24 11:38:39.284', '20260624113839_add_order_status_log_and_notes', NULL, NULL, '2026-06-24 11:38:39.127', 1),
('8cba8ca2-6a2e-48c8-ae15-ecf7b1326bd1', '7f659572188b9e3c5b718a673c3e7093168e88ebda0a9a95d0fdfecb1f3c1c96', '2026-06-28 12:32:58.507', '20260628123258_add_banner_slot', NULL, NULL, '2026-06-28 12:32:58.463', 1),
('90232e73-4ef7-4066-9cb4-5c07f96f2190', '9c6009f9fb2ca813c56899befc5dbdf8ead5653a1e5272b65d18f3621225c27f', '2026-07-01 17:04:46.363', '20260701090000_customer_id_string', NULL, NULL, '2026-07-01 17:04:46.029', 1),
('905d109b-c12a-4b02-9515-0885ee581602', '667113dc8efa2eafc1c8e04476714dd6c9348b1f4abc2e3d8783dadc4bc20e71', '2026-06-28 07:57:29.191', '20260628075729_add_order_customer_note', NULL, NULL, '2026-06-28 07:57:29.170', 1),
('96ffbaa4-b8cf-4aa2-a1fe-b33d1918d8a4', '12fd48613d0ce3146fbd62211fdf742101493607a68399d75d4c3484cd89b481', '2026-06-27 04:07:43.363', '20260627100641_add_review_status', NULL, NULL, '2026-06-27 04:07:43.315', 1),
('9fe5cee0-518f-43f5-bf57-52a167c1ac14', '86220ffabbc4cf4b814a098e04ad2e86655309e64b2246c01340949dd1f6b374', '2026-06-21 16:06:56.071', '20260621160656_add_order_email', NULL, NULL, '2026-06-21 16:06:56.055', 1),
('b582647f-fc7c-47b7-8a15-29bf8bbffe3b', '91ed69ac218c88b1b58e8caafb6eb686cb6c85d59a00fb017aaee732c6ebb205', '2026-06-30 15:37:16.534', '20260630150000_variant_color_size_matrix', NULL, NULL, '2026-06-30 15:37:16.471', 1),
('c13be797-4fbb-4379-a5aa-b7a381b502a9', '7b6e87cf4eb42616bdcaf5ecb9d62c91c86bf8eda228f958fc19eeaa11cb019d', '2026-06-30 14:09:14.121', '20260630140913_add_product_variants', NULL, NULL, '2026-06-30 14:09:13.980', 1),
('c959e2d0-76ba-4270-b94b-d0bcf37d5104', '9773b6aff7268483c2860d65ea0c4f9a86848224f85b91f4fb3ad278b24f7d7d', '2026-07-03 03:16:54.592', '20260703120000_add_conversion_features', NULL, NULL, '2026-07-03 03:16:53.581', 1),
('e1b75d1a-f042-48f8-badf-af74f9520423', 'a3365d8499911e7390a3b966dd8e1f4145f806e1f3a9dd509e467806f8c6c89b', '2026-07-02 06:28:21.264', '20260702120000_add_financial_reporting', NULL, NULL, '2026-07-02 06:28:21.188', 1),
('f8d73d78-53be-4360-afb3-470a31ae020a', 'bee113b2891019b477666c16102d697698d10e32402c8ebfc4a590e1b8a3d953', '2026-07-02 14:41:51.993', '20260702160000_add_admin_email_password_reset', NULL, NULL, '2026-07-02 14:41:51.845', 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `adminactivitylog`
--
ALTER TABLE `adminactivitylog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `AdminActivityLog_createdAt_idx` (`createdAt`),
  ADD KEY `AdminActivityLog_adminId_idx` (`adminId`);

--
-- Indexes for table `adminuser`
--
ALTER TABLE `adminuser`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `AdminUser_username_key` (`username`),
  ADD UNIQUE KEY `AdminUser_email_key` (`email`);

--
-- Indexes for table `banner`
--
ALTER TABLE `banner`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Banner_slot_isActive_sortOrder_idx` (`slot`,`isActive`,`sortOrder`);

--
-- Indexes for table `blockedip`
--
ALTER TABLE `blockedip`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `BlockedIp_ip_key` (`ip`);

--
-- Indexes for table `cartsession`
--
ALTER TABLE `cartsession`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `CartSession_recoveryToken_key` (`recoveryToken`),
  ADD UNIQUE KEY `CartSession_customerId_key` (`customerId`),
  ADD KEY `CartSession_reminderSentAt_orderedAt_updatedAt_idx` (`reminderSentAt`,`orderedAt`,`updatedAt`);

--
-- Indexes for table `category`
--
ALTER TABLE `category`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Category_slug_key` (`slug`),
  ADD KEY `Category_isActive_sortOrder_idx` (`isActive`,`sortOrder`);

--
-- Indexes for table `coupon`
--
ALTER TABLE `coupon`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Coupon_code_key` (`code`),
  ADD KEY `Coupon_isActive_idx` (`isActive`);

--
-- Indexes for table `couponredemption`
--
ALTER TABLE `couponredemption`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `CouponRedemption_orderId_key` (`orderId`),
  ADD KEY `CouponRedemption_couponId_idx` (`couponId`),
  ADD KEY `CouponRedemption_customerPhone_idx` (`customerPhone`);

--
-- Indexes for table `couriershipment`
--
ALTER TABLE `couriershipment`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `CourierShipment_orderId_key` (`orderId`),
  ADD UNIQUE KEY `CourierShipment_consignmentId_key` (`consignmentId`),
  ADD KEY `CourierShipment_consignmentId_idx` (`consignmentId`);

--
-- Indexes for table `customer`
--
ALTER TABLE `customer`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Customer_email_key` (`email`);

--
-- Indexes for table `expense`
--
ALTER TABLE `expense`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Expense_incurredOn_idx` (`incurredOn`);

--
-- Indexes for table `faqitem`
--
ALTER TABLE `faqitem`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FaqItem_isActive_sortOrder_idx` (`isActive`,`sortOrder`);

--
-- Indexes for table `flashsale`
--
ALTER TABLE `flashsale`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FlashSale_isActive_startsAt_endsAt_idx` (`isActive`,`startsAt`,`endsAt`);

--
-- Indexes for table `flashsaleproduct`
--
ALTER TABLE `flashsaleproduct`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `FlashSaleProduct_flashSaleId_productId_key` (`flashSaleId`,`productId`),
  ADD KEY `FlashSaleProduct_flashSaleId_sortOrder_idx` (`flashSaleId`,`sortOrder`),
  ADD KEY `FlashSaleProduct_productId_fkey` (`productId`);

--
-- Indexes for table `fraudcheckresult`
--
ALTER TABLE `fraudcheckresult`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `FraudCheckResult_phone_key` (`phone`);

--
-- Indexes for table `logintoken`
--
ALTER TABLE `logintoken`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `LoginToken_token_key` (`token`),
  ADD KEY `LoginToken_email_idx` (`email`);

--
-- Indexes for table `maillog`
--
ALTER TABLE `maillog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `MailLog_status_createdAt_idx` (`status`,`createdAt`);

--
-- Indexes for table `order`
--
ALTER TABLE `order`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Order_orderNo_key` (`orderNo`),
  ADD KEY `Order_status_createdAt_idx` (`status`,`createdAt`),
  ADD KEY `Order_customerPhone_idx` (`customerPhone`),
  ADD KEY `Order_shippingZoneId_fkey` (`shippingZoneId`),
  ADD KEY `Order_customerId_idx` (`customerId`);

--
-- Indexes for table `orderitem`
--
ALTER TABLE `orderitem`
  ADD PRIMARY KEY (`id`),
  ADD KEY `OrderItem_orderId_idx` (`orderId`),
  ADD KEY `OrderItem_productId_fkey` (`productId`),
  ADD KEY `OrderItem_variantId_fkey` (`variantId`);

--
-- Indexes for table `ordernote`
--
ALTER TABLE `ordernote`
  ADD PRIMARY KEY (`id`),
  ADD KEY `OrderNote_orderId_createdAt_idx` (`orderId`,`createdAt`);

--
-- Indexes for table `orderstatuslog`
--
ALTER TABLE `orderstatuslog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `OrderStatusLog_orderId_createdAt_idx` (`orderId`,`createdAt`);

--
-- Indexes for table `page`
--
ALTER TABLE `page`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Page_slug_key` (`slug`);

--
-- Indexes for table `passwordresettoken`
--
ALTER TABLE `passwordresettoken`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `PasswordResetToken_token_key` (`token`),
  ADD KEY `PasswordResetToken_adminId_idx` (`adminId`);

--
-- Indexes for table `payment`
--
ALTER TABLE `payment`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Payment_orderId_idx` (`orderId`),
  ADD KEY `Payment_provider_providerTxnId_idx` (`provider`,`providerTxnId`);

--
-- Indexes for table `product`
--
ALTER TABLE `product`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Product_slug_key` (`slug`),
  ADD KEY `Product_subcategoryId_status_idx` (`subcategoryId`,`status`),
  ADD KEY `Product_isFeatured_status_idx` (`isFeatured`,`status`);
ALTER TABLE `product` ADD FULLTEXT KEY `Product_name_description_idx` (`name`,`description`);

--
-- Indexes for table `productcolor`
--
ALTER TABLE `productcolor`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ProductColor_productId_sortOrder_idx` (`productId`,`sortOrder`);

--
-- Indexes for table `productfeature`
--
ALTER TABLE `productfeature`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ProductFeature_productId_sortOrder_idx` (`productId`,`sortOrder`);

--
-- Indexes for table `productimage`
--
ALTER TABLE `productimage`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ProductImage_productId_sortOrder_idx` (`productId`,`sortOrder`);

--
-- Indexes for table `productreview`
--
ALTER TABLE `productreview`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ProductReview_productId_customerId_key` (`productId`,`customerId`),
  ADD KEY `ProductReview_productId_status_createdAt_idx` (`productId`,`status`,`createdAt`),
  ADD KEY `ProductReview_customerId_fkey` (`customerId`);

--
-- Indexes for table `productspecification`
--
ALTER TABLE `productspecification`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ProductSpecification_productId_sortOrder_idx` (`productId`,`sortOrder`);

--
-- Indexes for table `productvariant`
--
ALTER TABLE `productvariant`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ProductVariant_productId_sortOrder_idx` (`productId`,`sortOrder`);

--
-- Indexes for table `returnrequest`
--
ALTER TABLE `returnrequest`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ReturnRequest_status_createdAt_idx` (`status`,`createdAt`),
  ADD KEY `ReturnRequest_orderId_idx` (`orderId`);

--
-- Indexes for table `setting`
--
ALTER TABLE `setting`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Setting_group_key_key` (`group`,`key`);

--
-- Indexes for table `shippingzone`
--
ALTER TABLE `shippingzone`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ShippingZone_isActive_sortOrder_idx` (`isActive`,`sortOrder`);

--
-- Indexes for table `smslog`
--
ALTER TABLE `smslog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `SmsLog_status_createdAt_idx` (`status`,`createdAt`);

--
-- Indexes for table `stockadjustment`
--
ALTER TABLE `stockadjustment`
  ADD PRIMARY KEY (`id`),
  ADD KEY `StockAdjustment_productId_createdAt_idx` (`productId`,`createdAt`);

--
-- Indexes for table `stocknotification`
--
ALTER TABLE `stocknotification`
  ADD PRIMARY KEY (`id`),
  ADD KEY `StockNotification_productId_notifiedAt_idx` (`productId`,`notifiedAt`);

--
-- Indexes for table `subcategory`
--
ALTER TABLE `subcategory`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Subcategory_slug_key` (`slug`),
  ADD KEY `Subcategory_categoryId_isActive_sortOrder_idx` (`categoryId`,`isActive`,`sortOrder`);

--
-- Indexes for table `wishlistitem`
--
ALTER TABLE `wishlistitem`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `WishlistItem_customerId_productId_key` (`customerId`,`productId`),
  ADD KEY `WishlistItem_customerId_idx` (`customerId`),
  ADD KEY `WishlistItem_productId_fkey` (`productId`);

--
-- Indexes for table `_prisma_migrations`
--
ALTER TABLE `_prisma_migrations`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `adminactivitylog`
--
ALTER TABLE `adminactivitylog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `adminuser`
--
ALTER TABLE `adminuser`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `banner`
--
ALTER TABLE `banner`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `blockedip`
--
ALTER TABLE `blockedip`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `cartsession`
--
ALTER TABLE `cartsession`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `category`
--
ALTER TABLE `category`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `coupon`
--
ALTER TABLE `coupon`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `couponredemption`
--
ALTER TABLE `couponredemption`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `couriershipment`
--
ALTER TABLE `couriershipment`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `expense`
--
ALTER TABLE `expense`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `faqitem`
--
ALTER TABLE `faqitem`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `flashsale`
--
ALTER TABLE `flashsale`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `flashsaleproduct`
--
ALTER TABLE `flashsaleproduct`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `fraudcheckresult`
--
ALTER TABLE `fraudcheckresult`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `logintoken`
--
ALTER TABLE `logintoken`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `maillog`
--
ALTER TABLE `maillog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `order`
--
ALTER TABLE `order`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=74;

--
-- AUTO_INCREMENT for table `orderitem`
--
ALTER TABLE `orderitem`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=76;

--
-- AUTO_INCREMENT for table `ordernote`
--
ALTER TABLE `ordernote`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `orderstatuslog`
--
ALTER TABLE `orderstatuslog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=109;

--
-- AUTO_INCREMENT for table `page`
--
ALTER TABLE `page`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `passwordresettoken`
--
ALTER TABLE `passwordresettoken`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `payment`
--
ALTER TABLE `payment`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `product`
--
ALTER TABLE `product`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `productcolor`
--
ALTER TABLE `productcolor`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `productfeature`
--
ALTER TABLE `productfeature`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `productimage`
--
ALTER TABLE `productimage`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;

--
-- AUTO_INCREMENT for table `productreview`
--
ALTER TABLE `productreview`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `productspecification`
--
ALTER TABLE `productspecification`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `productvariant`
--
ALTER TABLE `productvariant`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `returnrequest`
--
ALTER TABLE `returnrequest`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `setting`
--
ALTER TABLE `setting`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=61;

--
-- AUTO_INCREMENT for table `shippingzone`
--
ALTER TABLE `shippingzone`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `smslog`
--
ALTER TABLE `smslog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45;

--
-- AUTO_INCREMENT for table `stockadjustment`
--
ALTER TABLE `stockadjustment`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stocknotification`
--
ALTER TABLE `stocknotification`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `subcategory`
--
ALTER TABLE `subcategory`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `wishlistitem`
--
ALTER TABLE `wishlistitem`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `adminactivitylog`
--
ALTER TABLE `adminactivitylog`
  ADD CONSTRAINT `AdminActivityLog_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `adminuser` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `couponredemption`
--
ALTER TABLE `couponredemption`
  ADD CONSTRAINT `CouponRedemption_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `coupon` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `CouponRedemption_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `couriershipment`
--
ALTER TABLE `couriershipment`
  ADD CONSTRAINT `CourierShipment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `flashsaleproduct`
--
ALTER TABLE `flashsaleproduct`
  ADD CONSTRAINT `FlashSaleProduct_flashSaleId_fkey` FOREIGN KEY (`flashSaleId`) REFERENCES `flashsale` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `FlashSaleProduct_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `order`
--
ALTER TABLE `order`
  ADD CONSTRAINT `Order_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customer` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Order_shippingZoneId_fkey` FOREIGN KEY (`shippingZoneId`) REFERENCES `shippingzone` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `orderitem`
--
ALTER TABLE `orderitem`
  ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `OrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `OrderItem_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `productvariant` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `ordernote`
--
ALTER TABLE `ordernote`
  ADD CONSTRAINT `OrderNote_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `orderstatuslog`
--
ALTER TABLE `orderstatuslog`
  ADD CONSTRAINT `OrderStatusLog_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `passwordresettoken`
--
ALTER TABLE `passwordresettoken`
  ADD CONSTRAINT `PasswordResetToken_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `adminuser` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `payment`
--
ALTER TABLE `payment`
  ADD CONSTRAINT `Payment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `product`
--
ALTER TABLE `product`
  ADD CONSTRAINT `Product_subcategoryId_fkey` FOREIGN KEY (`subcategoryId`) REFERENCES `subcategory` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `productcolor`
--
ALTER TABLE `productcolor`
  ADD CONSTRAINT `ProductColor_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `productfeature`
--
ALTER TABLE `productfeature`
  ADD CONSTRAINT `ProductFeature_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `productimage`
--
ALTER TABLE `productimage`
  ADD CONSTRAINT `ProductImage_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `productreview`
--
ALTER TABLE `productreview`
  ADD CONSTRAINT `ProductReview_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customer` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ProductReview_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `productspecification`
--
ALTER TABLE `productspecification`
  ADD CONSTRAINT `ProductSpecification_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `productvariant`
--
ALTER TABLE `productvariant`
  ADD CONSTRAINT `ProductVariant_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `returnrequest`
--
ALTER TABLE `returnrequest`
  ADD CONSTRAINT `ReturnRequest_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `stockadjustment`
--
ALTER TABLE `stockadjustment`
  ADD CONSTRAINT `StockAdjustment_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `stocknotification`
--
ALTER TABLE `stocknotification`
  ADD CONSTRAINT `StockNotification_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `subcategory`
--
ALTER TABLE `subcategory`
  ADD CONSTRAINT `Subcategory_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `category` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `wishlistitem`
--
ALTER TABLE `wishlistitem`
  ADD CONSTRAINT `WishlistItem_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customer` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `WishlistItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
