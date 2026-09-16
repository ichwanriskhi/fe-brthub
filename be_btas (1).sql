-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Sep 15, 2026 at 09:44 AM
-- Server version: 8.0.30
-- PHP Version: 8.2.29

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `be_btas`
--

-- --------------------------------------------------------

--
-- Table structure for table `account`
--

CREATE TABLE `account` (
  `account_id` bigint UNSIGNED NOT NULL,
  `identity_id` bigint UNSIGNED NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `account`
--

INSERT INTO `account` (`account_id`, `identity_id`, `password_hash`, `is_active`, `last_login_at`, `created_at`, `updated_at`) VALUES
(1, 1, '$2y$12$ObroVR5fBbnGbmPIoLZaZSvj9vfg2MZUI.yJ1N3KTcosfogrOxxnr', 1, '2026-09-03 08:00:00', '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(2, 2, '$2y$12$7PMkUky/OJR1Xocurn84uPz6DqpJqL5zo/GfdhOYBey/H.3aURIrP', 1, '2026-09-03 08:10:00', '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(3, 3, '$2y$12$hBD94qGl63tOMjWIXHaub741td48fFeWXiEJq3BnIUmt/PCHhovLo', 1, '2026-09-03 08:15:00', '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(4, 4, NULL, 1, NULL, '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(5, 5, NULL, 1, NULL, '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(6, 7, '$2y$12$oeOo53epQni7KEYZmgBBDUR.gzv3pmCBrp7C3Jd/1.72kFnzdy/qY', 1, '2026-09-03 07:30:00', '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(7, 8, '$2y$12$DB9/JTjs9LIVdLG2k9flMRph4pMNALH7nTpzQtuWeD//enq744xk1', 1, '2026-09-02 17:45:00', '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(8, 9, NULL, 1, NULL, '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(9, 10, '$2y$12$TN/Pa0tQ8ihgJrMTnOqF52fBraXOqVJBae45I1Ljit5Y35npgX4AN', 1, '2026-09-03 09:05:00', '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(10, 11, NULL, 1, NULL, '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(11, 12, NULL, 1, NULL, '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(12, 13, NULL, 0, NULL, '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(13, 18, NULL, 1, NULL, '2026-09-03 16:42:15', '2026-09-03 16:42:15');

-- --------------------------------------------------------

--
-- Table structure for table `account_token`
--

CREATE TABLE `account_token` (
  `token_id` bigint UNSIGNED NOT NULL,
  `account_id` bigint UNSIGNED NOT NULL,
  `token_type` enum('SETUP_PASSWORD','RESET_PASSWORD') COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `requested_by_employee_id` bigint UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `account_token`
--

INSERT INTO `account_token` (`token_id`, `account_id`, `token_type`, `token_hash`, `expires_at`, `used_at`, `requested_by_employee_id`, `created_at`) VALUES
(1, 7, 'SETUP_PASSWORD', '$2y$12$aVn3QoRz9pWt6XyKmLb1u.eSd8cGf5HjP2xTr0nQwIv4vCoBySeMD', '2026-08-20 10:00:00', '2026-08-19 09:12:40', 2, '2026-08-18 09:00:00'),
(2, 9, 'SETUP_PASSWORD', '$2y$12$5uYb8XqRn2wTk1MaVo7z.dCf6HgL4JmQ0xPr9nSwEv3vBoAySeNC', '2026-08-21 10:00:00', '2026-08-20 08:30:15', 2, '2026-08-19 08:00:00'),
(3, 4, 'SETUP_PASSWORD', '$2y$12$8oXt5QwVn3RaKp1YmLb9u.fCg7HdJ2MzQ0xTr6nSwEv4vDoBySeOA', '2026-09-05 09:00:00', NULL, 2, '2026-09-01 09:00:00'),
(4, 5, 'SETUP_PASSWORD', '$2y$12$3nWs7YqTb1RmKa9XoVp5u.eDg6HfJ4LzP0xQr8nTwEv2vCoBySeQE', '2026-08-25 09:00:00', NULL, 2, '2026-08-24 09:00:00'),
(5, 1, 'RESET_PASSWORD', '$2y$12$6mYt2QsVn8RaLp4XoWb1u.gCf3HdK7MzQ5xTr0nSwEv9vAoBySeRF', '2026-09-02 20:00:00', '2026-09-02 19:41:08', 2, '2026-09-02 19:30:00');

-- --------------------------------------------------------

--
-- Table structure for table `category`
--

CREATE TABLE `category` (
  `category_id` bigint UNSIGNED NOT NULL,
  `category_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_category_id` bigint UNSIGNED DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `category`
--

INSERT INTO `category` (`category_id`, `category_code`, `category_name`, `parent_category_id`, `description`, `is_active`) VALUES
(1, 'VEHICLE', 'Vehicle', NULL, 'Kendaraan.', 1),
(2, 'VEHICLE_PART', 'Vehicle Part', 1, 'Part kendaraan.', 1),
(3, 'FACILITY', 'Facility', NULL, 'Fasilitas.', 1),
(4, 'IT_SERVICE', 'IT Service', NULL, 'Layanan IT.', 1),
(5, 'VEHICLE_MAINTENANCE', 'Vehicle Maintenance', 1, 'Maintenance kendaraan.', 1),
(6, 'VEHICLE_OPERATION', 'Vehicle Operation', 1, 'Operasional kendaraan.', 1),
(7, 'ENGINE_PART', 'Engine Part', 2, 'Part engine.', 1),
(8, 'ELECTRICAL_PART', 'Electrical Part', 2, 'Part kelistrikan.', 1),
(9, 'OFFICE_FACILITY', 'Office Facility', 3, 'Fasilitas kantor.', 1),
(10, 'BUILDING_FACILITY', 'Building Facility', 3, 'Fasilitas gedung.', 1),
(11, 'NETWORK', 'Network', 4, 'Jaringan.', 1),
(12, 'APPLICATION', 'Application', 4, 'Aplikasi.', 1),
(13, 'HARDWARE', 'Hardware', 4, 'Perangkat keras.', 1);

-- --------------------------------------------------------

--
-- Table structure for table `customer`
--

CREATE TABLE `customer` (
  `customer_id` bigint UNSIGNED NOT NULL,
  `identity_id` bigint UNSIGNED NOT NULL,
  `customer_since` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `customer`
--

INSERT INTO `customer` (`customer_id`, `identity_id`, `customer_since`, `is_active`) VALUES
(1, 6, '2026-01-10', 1),
(2, 14, '2026-02-12', 1),
(3, 15, '2026-03-08', 1),
(4, 16, '2026-04-15', 1),
(5, 17, '2026-05-20', 1),
(6, 18, '2026-06-03', 1);

-- --------------------------------------------------------

--
-- Table structure for table `department`
--

CREATE TABLE `department` (
  `department_id` bigint UNSIGNED NOT NULL,
  `department_code` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_department_id` bigint UNSIGNED DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `department`
--

INSERT INTO `department` (`department_id`, `department_code`, `department_name`, `parent_department_id`, `is_active`) VALUES
(1, 'EXEC', 'Executive', NULL, 1),
(2, 'IT', 'Information Technology', 1, 1),
(3, 'TECH', 'Teknik', 1, 1),
(4, 'MKT', 'Marketing', 1, 1),
(5, 'OPS', 'Operasional', 1, 1),
(6, 'GA', 'General Affairs', 1, 1),
(7, 'CS', 'Customer Service', 5, 1),
(8, 'FIN', 'Finance', 1, 1),
(9, 'HR', 'Human Resources', 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `employee`
--

CREATE TABLE `employee` (
  `employee_id` bigint UNSIGNED NOT NULL,
  `identity_id` bigint UNSIGNED NOT NULL,
  `employee_no` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` bigint UNSIGNED NOT NULL,
  `position_id` bigint UNSIGNED NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `employee`
--

INSERT INTO `employee` (`employee_id`, `identity_id`, `employee_no`, `department_id`, `position_id`, `is_active`, `created_at`) VALUES
(1, 1, 'EMP001', 1, 4, 1, '2026-09-03 16:42:15'),
(2, 2, 'EMP002', 2, 3, 1, '2026-09-03 16:42:15'),
(3, 3, 'EMP003', 3, 2, 1, '2026-09-03 16:42:15'),
(4, 4, 'EMP004', 3, 1, 1, '2026-09-03 16:42:15'),
(5, 5, 'EMP005', 4, 1, 1, '2026-09-03 16:42:15'),
(6, 7, 'EMP006', 5, 4, 1, '2026-09-03 16:42:15'),
(7, 8, 'EMP007', 3, 2, 1, '2026-09-03 16:42:15'),
(8, 9, 'EMP008', 3, 3, 1, '2026-09-03 16:42:15'),
(9, 10, 'EMP009', 3, 1, 1, '2026-09-03 16:42:15'),
(10, 11, 'EMP010', 2, 1, 1, '2026-09-03 16:42:15'),
(11, 12, 'EMP011', 6, 1, 1, '2026-09-03 16:42:15'),
(12, 13, 'EMP012', 2, 3, 1, '2026-09-03 16:42:15'),
(13, 18, 'EMP013', 7, 2, 1, '2026-09-03 16:42:15'),
(14, 6, 'EMP014', 5, 2, 1, '2026-09-03 16:42:15');

-- --------------------------------------------------------

--
-- Table structure for table `employee_role`
--

CREATE TABLE `employee_role` (
  `employee_id` bigint UNSIGNED NOT NULL,
  `role_id` bigint UNSIGNED NOT NULL,
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `assigned_by_employee_id` bigint UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `employee_role`
--

INSERT INTO `employee_role` (`employee_id`, `role_id`, `assigned_at`, `assigned_by_employee_id`) VALUES
(1, 2, '2026-09-03 16:42:15', NULL),
(2, 1, '2026-09-03 16:42:15', 1),
(2, 2, '2026-09-03 16:42:15', 1),
(3, 2, '2026-09-03 16:42:15', 2),
(4, 4, '2026-09-03 16:42:15', 3),
(6, 2, '2026-09-03 16:42:15', 2),
(6, 3, '2026-09-03 16:42:15', 2),
(7, 3, '2026-09-03 16:42:15', 2),
(8, 4, '2026-09-03 16:42:15', 7),
(9, 4, '2026-09-03 16:42:15', 7),
(10, 4, '2026-09-03 16:42:15', 3),
(11, 4, '2026-09-03 16:42:15', 2),
(12, 2, '2026-09-03 16:42:15', 2),
(13, 3, '2026-09-03 16:42:15', 2),
(14, 3, '2026-09-03 16:42:15', 2);

-- --------------------------------------------------------

--
-- Table structure for table `identity`
--

CREATE TABLE `identity` (
  `identity_id` bigint UNSIGNED NOT NULL,
  `phone_number` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `identity`
--

INSERT INTO `identity` (`identity_id`, `phone_number`, `name`, `address`, `created_at`, `updated_at`) VALUES
(1, '081234567801', 'Andi Pratama', 'Jl. Sudirman No. 45, Jakarta Selatan', '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(2, '081345678902', 'Budi Santoso', 'Jl. Gatot Subroto No. 12, Jakarta Selatan', '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(3, '082198765403', 'Citra Lestari', 'Jl. Ahmad Yani No. 88, Bekasi Timur', '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(4, '085212345604', 'Deni Wijaya', 'Jl. Chairil Anwar No. 21, Bekasi Barat', '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(5, '087811223305', 'Siti Rahma', 'Jl. Kemang Raya No. 5, Jakarta Selatan', '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(6, '089654332106', 'Rina Marlina', 'Jl. Asia Afrika No. 101, Bandung', '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(7, '081766554407', 'Arif Nugraha', 'Jl. Rasuna Said No. 33, Jakarta Selatan', '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(8, '081399887708', 'Gita Maharani', 'Jl. Kuningan Barat No. 9, Jakarta Selatan', '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(9, '085711223309', 'Hendra Wijaya', 'Jl. Ahmad Yani No. 15, Bekasi Timur', '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(10, '081298765410', 'Intan Permata', 'Jl. Diponegoro No. 7, Jakarta Pusat', '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(11, '082245678911', 'Joko Susilo', 'Jl. Salemba Raya No. 20, Jakarta Pusat', '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(12, '085611223412', 'Karin Amelia', 'Jl. Margonda Raya No. 55, Depok', '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(13, '081555667713', 'Lukman Hakim', 'Jl. Kebon Jeruk No. 8, Jakarta Barat', '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(14, '087865432114', 'Rizky Maulana', 'Jl. Cempaka Putih No. 17, Jakarta Pusat', '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(15, '089877665515', 'Nadia Putri', 'Jl. Pajajaran No. 30, Bogor', '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(16, '081233445516', 'Yoga Pranata', 'Jl. Otista No. 4, Jakarta Timur', '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(17, '081876543217', 'Maya Anggraini', 'Jl. MH Thamrin No. 60, Tangerang', '2026-09-03 16:42:15', '2026-09-03 16:42:15'),
(18, '082312345618', 'Agus Setiawan', 'Jl. Ahmad Yani No. 40, Bekasi Selatan', '2026-09-03 16:42:15', '2026-09-03 16:42:15');

-- --------------------------------------------------------

--
-- Table structure for table `otp_verification`
--

CREATE TABLE `otp_verification` (
  `otp_id` bigint UNSIGNED NOT NULL,
  `identity_id` bigint UNSIGNED NOT NULL,
  `purpose` enum('LOGIN','TICKET_VERIFICATION','ACCOUNT_VERIFICATION') COLLATE utf8mb4_unicode_ci NOT NULL,
  `otp_code_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `verified_at` datetime DEFAULT NULL,
  `attempt_count` int UNSIGNED NOT NULL DEFAULT '0',
  `max_attempt` int UNSIGNED NOT NULL DEFAULT '3',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `otp_verification`
--

INSERT INTO `otp_verification` (`otp_id`, `identity_id`, `purpose`, `otp_code_hash`, `expires_at`, `verified_at`, `attempt_count`, `max_attempt`, `created_at`) VALUES
(1, 6, 'TICKET_VERIFICATION', '$2y$12$k1QOZs2h3n8VbY7pXqLKru3fWn9dCq6mRt0yZsJb4Iu8lV2eQxTqO', '2026-09-01 09:05:00', '2026-09-01 09:01:12', 1, 3, '2026-09-01 08:58:30'),
(2, 15, 'TICKET_VERIFICATION', '$2y$12$4uWn7bXeR2sKpQz1TmVYr.9oJhL6dCa3fGx0sYb8Nq5Iw2vRtEuKO', '2026-08-27 07:50:00', '2026-08-27 07:44:55', 2, 3, '2026-08-27 07:40:10'),
(3, 16, 'TICKET_VERIFICATION', '$2y$12$9pLxTq3vRnKa8ZoYs1uWc.eBg7hDf6mJ4XtCr0yQbNv2Iw5sPzUOR', '2026-09-03 07:55:00', NULL, 1, 3, '2026-09-03 07:50:00'),
(4, 2, 'LOGIN', '$2y$12$Rb5vNq8XoWtKa1uJmYr7z.eDs4cLf6HgP0xTn9QzIw3vCoRySeUAB', '2026-09-03 08:10:30', '2026-09-03 08:09:02', 1, 3, '2026-09-03 08:07:45'),
(5, 13, 'ACCOUNT_VERIFICATION', '$2y$12$Vx8oTn3QwRb5aKp1YmLz9u.eDf6HgJ4CzP0xSr7nTwEv2vAoBySeGH', '2026-09-03 10:15:00', '2026-09-03 10:11:47', 1, 3, '2026-09-03 10:08:00');

-- --------------------------------------------------------

--
-- Table structure for table `position`
--

CREATE TABLE `position` (
  `position_id` bigint UNSIGNED NOT NULL,
  `position_code` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `position_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hierarchy_level` int NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `position`
--

INSERT INTO `position` (`position_id`, `position_code`, `position_name`, `hierarchy_level`, `is_active`) VALUES
(1, 'STAFF', 'Staff', 1, 1),
(2, 'SUPERVISOR', 'Supervisor', 2, 1),
(3, 'MANAGER', 'Manager', 3, 1),
(4, 'DIRECTOR', 'Director Utama', 4, 1);

-- --------------------------------------------------------

--
-- Table structure for table `priority`
--

CREATE TABLE `priority` (
  `priority_id` bigint UNSIGNED NOT NULL,
  `priority_code` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `priority_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `sort_order` int NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `priority`
--

INSERT INTO `priority` (`priority_id`, `priority_code`, `priority_name`, `description`, `sort_order`, `is_active`) VALUES
(1, 'A', 'Critical', 'Sangat penting; final closure Director Utama.', 1, 1),
(2, 'B', 'High', 'Penting; final closure sesuai business rule Manager.', 2, 1),
(3, 'C', 'Normal', 'Kasus umum.', 3, 1);

-- --------------------------------------------------------

--
-- Table structure for table `product`
--

CREATE TABLE `product` (
  `product_id` bigint UNSIGNED NOT NULL,
  `product_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `product`
--

INSERT INTO `product` (`product_id`, `product_code`, `product_name`, `description`, `is_active`) VALUES
(1, 'ECU-JUKEN', 'ECU Juken', 'Electronic Control Unit Juken.', 1),
(2, 'CDI', 'CDI', 'Capacitor Discharge Ignition.', 1),
(3, 'CVT', 'CVT', 'Continuously Variable Transmission.', 1),
(4, 'BRAKE', 'Brake System', 'Brake-related component.', 1),
(5, 'BATTERY', 'Battery', 'Vehicle battery.', 1);

-- --------------------------------------------------------

--
-- Table structure for table `role`
--

CREATE TABLE `role` (
  `role_id` bigint UNSIGNED NOT NULL,
  `role_code` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `role`
--

INSERT INTO `role` (`role_id`, `role_code`, `role_name`, `description`, `is_active`) VALUES
(1, 'ADMIN', 'Admin', 'Mengelola employee, account, role dan master data.', 1),
(2, 'REVIEWER', 'Reviewer', 'Melakukan review dan menentukan routing/keputusan tiket.', 1),
(3, 'UNIT_ASSIGNMENT', 'Unit Assignment', 'Menerima routing unit dan memilih handler.', 1),
(4, 'HANDLER', 'Handler', 'Menindaklanjuti tiket dan mengajukan resolution.', 1);

-- --------------------------------------------------------

--
-- Table structure for table `ticket`
--

CREATE TABLE `ticket` (
  `ticket_id` bigint UNSIGNED NOT NULL,
  `ticket_no` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reporter_identity_id` bigint UNSIGNED NOT NULL,
  `customer_id` bigint UNSIGNED DEFAULT NULL,
  `product_id` bigint UNSIGNED DEFAULT NULL,
  `category_id` bigint UNSIGNED NOT NULL,
  `ticket_type_id` bigint UNSIGNED NOT NULL,
  `priority_id` bigint UNSIGNED NOT NULL,
  `status_id` bigint UNSIGNED NOT NULL,
  `vehicle_id` bigint UNSIGNED DEFAULT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `closed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ticket`
--

INSERT INTO `ticket` (`ticket_id`, `ticket_no`, `reporter_identity_id`, `customer_id`, `product_id`, `category_id`, `ticket_type_id`, `priority_id`, `status_id`, `vehicle_id`, `subject`, `description`, `created_at`, `updated_at`, `closed_at`) VALUES
(1, 'TCK-0001', 1, NULL, NULL, 12, 2, 2, 6, NULL, 'Aplikasi approval tidak dapat diakses', 'Aplikasi approval tidak dapat diakses sejak pagi.', '2026-09-01 08:00:00', '2026-09-01 16:30:00', '2026-09-01 16:30:00'),
(2, 'TCK-0002', 6, 1, 1, 8, 3, 1, 6, 1, 'Keluhan ECU kendaraan bermasalah', 'Customer melaporkan ECU Juken bermasalah ketika kendaraan digunakan.', '2026-09-01 09:00:00', '2026-09-02 17:00:00', '2026-09-02 17:00:00'),
(3, 'TCK-0003', 6, 1, 1, 8, 2, 3, 1, 1, 'ECU kembali bermasalah', 'Customer melaporkan masalah serupa kembali terjadi.', '2026-09-03 08:00:00', '2026-09-03 08:00:00', NULL),
(4, 'TCK-0004', 2, NULL, NULL, 9, 1, 3, 2, NULL, 'Permintaan kursi kerja baru', 'Staff meminta kursi kerja baru karena kursi lama rusak.', '2026-09-02 08:30:00', '2026-09-03 09:00:00', NULL),
(5, 'TCK-0005', 3, NULL, NULL, 11, 2, 2, 6, NULL, 'Wi-Fi lantai 2 tidak dapat digunakan', 'Wi-Fi di lantai 2 tidak dapat digunakan sejak pagi.', '2026-08-28 08:20:00', '2026-08-29 17:00:00', '2026-08-29 17:00:00'),
(6, 'TCK-0006', 4, NULL, NULL, 12, 1, 3, 2, NULL, 'Permintaan akses aplikasi', 'Employee meminta akses ke aplikasi approval.', '2026-09-02 09:00:00', '2026-09-03 10:00:00', NULL),
(7, 'TCK-0007', 5, NULL, NULL, 10, 3, 2, 5, NULL, 'Keluhan AC ruang meeting', 'AC ruang meeting tidak memberikan pendinginan yang memadai.', '2026-08-25 13:00:00', '2026-08-26 10:30:00', '2026-08-26 10:30:00'),
(8, 'TCK-0008', 14, 2, NULL, 4, 4, 3, 3, NULL, 'Pertanyaan jadwal maintenance', 'Customer meminta informasi jadwal maintenance aplikasi.', '2026-09-02 14:00:00', '2026-09-02 15:00:00', NULL),
(9, 'TCK-0009', 4, NULL, 2, 8, 1, 2, 2, 2, 'Permintaan penggantian CDI', 'Meminta penggantian CDI karena performa menurun.', '2026-09-01 10:00:00', '2026-09-02 13:00:00', NULL),
(10, 'TCK-0010', 15, 3, NULL, 6, 3, 1, 3, 3, 'Keluhan keterlambatan kendaraan', 'Customer mengeluhkan keterlambatan kendaraan pada jam sibuk.', '2026-08-27 07:45:00', '2026-08-27 15:00:00', NULL),
(11, 'TCK-0011', 10, NULL, NULL, 13, 1, 3, 6, NULL, 'Permintaan monitor tambahan', 'Staff meminta monitor tambahan untuk pekerjaan.', '2026-08-20 10:00:00', '2026-08-22 16:00:00', '2026-08-22 16:00:00'),
(12, 'TCK-0012', 11, NULL, NULL, 9, 1, 3, 4, NULL, 'Permintaan perbaikan lampu', 'Lampu area kerja mati dan membutuhkan tindak lanjut.', '2026-09-01 10:30:00', '2026-09-03 09:00:00', NULL),
(13, 'TCK-0013', 16, 4, 5, 8, 1, 3, 1, 4, 'Permintaan pemeriksaan battery', 'Customer meminta pemeriksaan battery karena starter bermasalah.', '2026-09-03 08:00:00', '2026-09-03 08:00:00', NULL),
(14, 'TCK-0014', 2, NULL, NULL, 12, 4, 3, 6, NULL, 'Pertanyaan status integrasi Wansis', 'Meminta informasi status sinkronisasi data kendaraan.', '2026-08-15 09:00:00', '2026-08-15 15:00:00', '2026-08-15 15:00:00'),
(15, 'TCK-0015', 12, NULL, NULL, 13, 2, 2, 2, NULL, 'Laptop handler tidak dapat menyala', 'Laptop handler tidak dapat digunakan.', '2026-09-03 09:00:00', '2026-09-03 10:30:00', NULL),
(16, 'TCK-0016', 5, NULL, NULL, 10, 3, 2, 2, NULL, 'Keluhan toilet tidak terawat', 'Employee melaporkan kondisi toilet kurang terawat.', '2026-09-02 13:00:00', '2026-09-03 09:30:00', NULL),
(17, 'TCK-0017', 4, NULL, 4, 8, 1, 2, 6, 2, 'Permintaan brake pad', 'Maintenance meminta penggantian brake pad.', '2026-08-10 10:00:00', '2026-08-12 16:00:00', '2026-08-12 16:00:00'),
(18, 'TCK-0018', 3, NULL, NULL, 11, 2, 3, 4, NULL, 'Gangguan printer jaringan', 'Printer jaringan tidak dapat terhubung.', '2026-09-03 11:00:00', '2026-09-03 14:00:00', NULL),
(19, 'TCK-0019', 14, 2, NULL, 4, 3, 2, 6, NULL, 'Keluhan respon layanan terlalu lama', 'Customer mengeluhkan waktu respon layanan.', '2026-08-05 09:00:00', '2026-08-06 17:00:00', '2026-08-06 17:00:00'),
(20, 'TCK-0020', 18, 6, NULL, 4, 4, 3, 3, NULL, 'Pertanyaan nomor kontak layanan', 'Customer meminta nomor kontak resmi layanan.', '2026-09-02 15:00:00', '2026-09-02 15:30:00', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `ticket_activity`
--

CREATE TABLE `ticket_activity` (
  `activity_id` bigint UNSIGNED NOT NULL,
  `ticket_id` bigint UNSIGNED NOT NULL,
  `actor_identity_id` bigint UNSIGNED DEFAULT NULL,
  `activity_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `old_status_id` bigint UNSIGNED DEFAULT NULL,
  `new_status_id` bigint UNSIGNED DEFAULT NULL,
  `details` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ticket_activity`
--

INSERT INTO `ticket_activity` (`activity_id`, `ticket_id`, `actor_identity_id`, `activity_type`, `old_status_id`, `new_status_id`, `details`, `created_at`) VALUES
(1, 1, 1, 'CREATED', NULL, 1, 'Ticket dibuat oleh internal employee.', '2026-09-01 08:00:00'),
(2, 1, 2, 'STATUS_CHANGED', 1, 2, 'Ticket masuk proses IT.', '2026-09-01 08:20:00'),
(3, 1, 2, 'RESOLUTION_SUBMITTED', 2, 3, 'Resolution #1 diajukan.', '2026-09-01 15:30:00'),
(4, 1, 2, 'REVIEWED', NULL, NULL, 'Resolution disetujui.', '2026-09-01 16:00:00'),
(5, 1, 1, 'STATUS_CHANGED', 3, 6, 'Final closure.', '2026-09-01 16:30:00'),
(6, 2, 6, 'CREATED', NULL, 1, 'Ticket dibuat customer.', '2026-09-01 09:00:00'),
(7, 2, 3, 'UPDATED', NULL, NULL, 'Reviewer membuat revision #2 tanpa menghapus data original.', '2026-09-01 09:20:00'),
(8, 2, 3, 'STATUS_CHANGED', 1, 2, 'Ticket dirouting ke Teknik.', '2026-09-01 09:30:00'),
(9, 2, 4, 'RESOLUTION_SUBMITTED', 2, 3, 'Resolution #1 diajukan.', '2026-09-02 14:00:00'),
(10, 2, 3, 'REVIEWED', NULL, NULL, 'Resolution disetujui.', '2026-09-02 16:00:00'),
(11, 2, 1, 'STATUS_CHANGED', 3, 6, 'Priority A ditutup Director Utama.', '2026-09-02 17:00:00'),
(12, 3, 6, 'CREATED', NULL, 1, 'Recurring ticket dibuat.', '2026-09-03 08:00:00'),
(13, 3, 3, 'RELATION_ADDED', NULL, NULL, 'Ditandai sebagai recurring of TCK-0002.', '2026-09-03 08:30:00'),
(14, 4, 2, 'CREATED', NULL, 1, 'Request kursi kerja dibuat.', '2026-09-02 08:30:00'),
(15, 4, 2, 'STATUS_CHANGED', 1, 2, 'Request dirouting ke General Affairs.', '2026-09-02 09:00:00'),
(16, 5, 3, 'CREATED', NULL, 1, 'Incident Wi-Fi dibuat internal.', '2026-08-28 08:20:00'),
(17, 5, 3, 'STATUS_CHANGED', 1, 2, 'Incident dirouting ke IT.', '2026-08-28 09:00:00'),
(18, 5, 10, 'RESOLUTION_SUBMITTED', 2, 3, 'Resolution Wi-Fi diajukan.', '2026-08-29 14:00:00'),
(19, 5, 2, 'REVIEWED', NULL, NULL, 'Resolution disetujui.', '2026-08-29 16:00:00'),
(20, 5, 2, 'STATUS_CHANGED', 3, 6, 'Ticket closed.', '2026-08-29 17:00:00'),
(21, 7, 5, 'CREATED', NULL, 1, 'Complaint fasilitas dibuat.', '2026-08-25 13:00:00'),
(22, 7, 2, 'STATUS_CHANGED', 1, 5, 'Ticket rejected setelah review.', '2026-08-26 10:30:00'),
(23, 8, 14, 'CREATED', NULL, 1, 'Inquiry dibuat customer.', '2026-09-02 14:00:00'),
(24, 8, 12, 'STATUS_CHANGED', 1, 3, 'Inquiry menunggu review/jawaban.', '2026-09-02 15:00:00'),
(25, 12, 11, 'CREATED', NULL, 1, 'Request lampu dibuat.', '2026-09-01 10:30:00'),
(26, 12, 11, 'STATUS_CHANGED', 1, 2, 'Request diteruskan ke General Affairs.', '2026-09-01 11:00:00'),
(27, 12, 11, 'STATUS_CHANGED', 2, 4, 'Material belum tersedia; perlu tindak lanjut.', '2026-09-03 09:00:00'),
(28, 15, 12, 'CREATED', NULL, 1, 'Incident laptop dibuat.', '2026-09-03 09:00:00'),
(29, 15, 3, 'STATUS_CHANGED', 1, 2, 'Incident diarahkan ke IT.', '2026-09-03 09:30:00'),
(30, 18, 3, 'CREATED', NULL, 1, 'Incident printer dibuat.', '2026-09-03 11:00:00'),
(31, 18, 3, 'STATUS_CHANGED', 1, 2, 'Incident diarahkan ke IT.', '2026-09-03 11:30:00'),
(32, 18, 3, 'STATUS_CHANGED', 2, 4, 'Menunggu informasi konfigurasi tambahan.', '2026-09-03 14:00:00'),
(33, 6, 4, 'CREATED', NULL, 1, 'Request akses aplikasi dibuat.', '2026-09-02 09:00:00'),
(34, 6, 3, 'STATUS_CHANGED', 1, 2, 'Request dirouting ke IT.', '2026-09-02 09:30:00'),
(35, 9, 4, 'CREATED', NULL, 1, 'Request penggantian CDI dibuat.', '2026-09-01 10:00:00'),
(36, 9, 3, 'STATUS_CHANGED', 1, 2, 'Request dirouting ke Teknik.', '2026-09-01 11:00:00'),
(37, 10, 15, 'CREATED', NULL, 1, 'Complaint keterlambatan kendaraan dibuat customer.', '2026-08-27 07:45:00'),
(38, 10, 7, 'STATUS_CHANGED', 1, 2, 'Complaint dirouting ke Operasional.', '2026-08-27 08:15:00'),
(39, 10, 9, 'STATUS_CHANGED', 2, 3, 'Menunggu review lanjutan dari tim Operasional.', '2026-08-27 15:00:00'),
(40, 11, 10, 'CREATED', NULL, 1, 'Request monitor tambahan dibuat.', '2026-08-20 10:00:00'),
(41, 11, 2, 'STATUS_CHANGED', 1, 2, 'Request hardware dirouting ke IT.', '2026-08-20 10:30:00'),
(42, 11, 11, 'RESOLUTION_SUBMITTED', 2, 3, 'Resolution monitor diajukan.', '2026-08-22 14:30:00'),
(43, 11, 2, 'REVIEWED', NULL, NULL, 'Resolution disetujui.', '2026-08-22 15:30:00'),
(44, 11, 2, 'STATUS_CHANGED', 3, 6, 'Ticket closed.', '2026-08-22 16:00:00'),
(45, 13, 16, 'CREATED', NULL, 1, 'Request pemeriksaan battery dibuat customer.', '2026-09-03 08:00:00'),
(46, 14, 2, 'CREATED', NULL, 1, 'Inquiry status integrasi dibuat.', '2026-08-15 09:00:00'),
(47, 14, 13, 'STATUS_CHANGED', 1, 6, 'Inquiry dijawab langsung dan ticket ditutup.', '2026-08-15 15:00:00'),
(48, 16, 5, 'CREATED', NULL, 1, 'Complaint fasilitas dibuat.', '2026-09-02 13:00:00'),
(49, 16, 6, 'STATUS_CHANGED', 1, 2, 'Complaint dirouting ke General Affairs.', '2026-09-02 15:00:00'),
(50, 17, 4, 'CREATED', NULL, 1, 'Request brake pad dibuat.', '2026-08-10 10:00:00'),
(51, 17, 9, 'STATUS_CHANGED', 1, 2, 'Request dirouting ke Teknik.', '2026-08-10 11:00:00'),
(52, 17, 10, 'RESOLUTION_SUBMITTED', 2, 3, 'Brake pad diganti.', '2026-08-12 10:00:00'),
(53, 17, 9, 'REVIEWED', NULL, NULL, 'Resolution disetujui.', '2026-08-12 15:00:00'),
(54, 17, 9, 'STATUS_CHANGED', 3, 6, 'Ticket closed.', '2026-08-12 16:00:00'),
(55, 19, 14, 'CREATED', NULL, 1, 'Complaint respon layanan dibuat customer.', '2026-08-05 09:00:00'),
(56, 19, 18, 'STATUS_CHANGED', 1, 3, 'Complaint diteruskan ke Customer Service.', '2026-08-05 13:00:00'),
(57, 19, 18, 'STATUS_CHANGED', 3, 6, 'Keluhan ditindaklanjuti dan ticket ditutup.', '2026-08-06 17:00:00'),
(58, 20, 18, 'CREATED', NULL, 1, 'Inquiry nomor kontak dibuat.', '2026-09-02 15:00:00'),
(59, 20, 18, 'STATUS_CHANGED', 1, 3, 'Inquiry menunggu jawaban dari Customer Service.', '2026-09-02 15:30:00');

-- --------------------------------------------------------

--
-- Table structure for table `ticket_assignment`
--

CREATE TABLE `ticket_assignment` (
  `assignment_id` bigint UNSIGNED NOT NULL,
  `ticket_id` bigint UNSIGNED NOT NULL,
  `assignment_type` enum('UNIT','HANDLER') COLLATE utf8mb4_unicode_ci NOT NULL,
  `assigned_to_employee_id` bigint UNSIGNED NOT NULL,
  `assigned_by_identity_id` bigint UNSIGNED NOT NULL,
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `unassigned_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ticket_assignment`
--

INSERT INTO `ticket_assignment` (`assignment_id`, `ticket_id`, `assignment_type`, `assigned_to_employee_id`, `assigned_by_identity_id`, `assigned_at`, `unassigned_at`) VALUES
(1, 1, 'HANDLER', 10, 2, '2026-09-01 08:30:00', NULL),
(2, 2, 'UNIT', 7, 3, '2026-09-01 09:30:00', NULL),
(3, 2, 'HANDLER', 4, 8, '2026-09-01 10:00:00', NULL),
(4, 3, 'UNIT', 7, 3, '2026-09-03 08:30:00', NULL),
(5, 4, 'UNIT', 14, 2, '2026-09-02 09:00:00', NULL),
(6, 4, 'HANDLER', 11, 6, '2026-09-02 10:00:00', NULL),
(7, 5, 'UNIT', 6, 3, '2026-08-28 09:00:00', NULL),
(8, 5, 'HANDLER', 10, 6, '2026-08-28 10:00:00', NULL),
(9, 6, 'HANDLER', 10, 3, '2026-09-02 09:30:00', NULL),
(10, 9, 'UNIT', 6, 3, '2026-09-01 11:00:00', NULL),
(11, 9, 'HANDLER', 9, 7, '2026-09-01 12:00:00', NULL),
(12, 10, 'UNIT', 6, 3, '2026-08-27 08:30:00', NULL),
(13, 10, 'HANDLER', 8, 7, '2026-08-27 09:00:00', NULL),
(14, 12, 'UNIT', 14, 5, '2026-09-01 11:00:00', NULL),
(15, 12, 'HANDLER', 11, 6, '2026-09-01 13:00:00', NULL),
(16, 15, 'HANDLER', 10, 3, '2026-09-03 09:30:00', NULL),
(17, 16, 'UNIT', 14, 5, '2026-09-02 14:00:00', NULL),
(18, 16, 'HANDLER', 11, 6, '2026-09-02 15:00:00', NULL),
(19, 18, 'UNIT', 6, 3, '2026-09-03 11:30:00', NULL),
(20, 11, 'HANDLER', 10, 2, '2026-08-20 11:00:00', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `ticket_attachment`
--

CREATE TABLE `ticket_attachment` (
  `attachment_id` bigint UNSIGNED NOT NULL,
  `ticket_id` bigint UNSIGNED NOT NULL,
  `interaction_id` bigint UNSIGNED DEFAULT NULL,
  `resolution_id` bigint UNSIGNED DEFAULT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_size` bigint UNSIGNED DEFAULT NULL,
  `uploaded_by_identity_id` bigint UNSIGNED NOT NULL,
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ticket_attachment`
--

INSERT INTO `ticket_attachment` (`attachment_id`, `ticket_id`, `interaction_id`, `resolution_id`, `file_name`, `file_url`, `mime_type`, `file_size`, `uploaded_by_identity_id`, `uploaded_at`) VALUES
(1, 2, 3, NULL, 'foto-ecu.jpg', '/uploads/TCK-0002/foto-ecu.jpg', 'image/jpeg', 245760, 6, '2026-09-03 16:42:16'),
(2, 2, NULL, 2, 'ecu-setelah-perbaikan.jpg', '/uploads/TCK-0002/ecu-setelah-perbaikan.jpg', 'image/jpeg', 318450, 4, '2026-09-03 16:42:16'),
(3, 5, 6, NULL, 'foto-access-point.jpg', '/uploads/TCK-0005/foto-access-point.jpg', 'image/jpeg', 298450, 3, '2026-09-03 16:42:16'),
(4, 5, NULL, 3, 'access-point-setelah-perbaikan.jpg', '/uploads/TCK-0005/access-point-setelah-perbaikan.jpg', 'image/jpeg', 355120, 10, '2026-09-03 16:42:16'),
(5, 11, NULL, 4, 'monitor-terpasang.jpg', '/uploads/TCK-0011/monitor-terpasang.jpg', 'image/jpeg', 355000, 10, '2026-09-03 16:42:16');

-- --------------------------------------------------------

--
-- Table structure for table `ticket_interaction`
--

CREATE TABLE `ticket_interaction` (
  `interaction_id` bigint UNSIGNED NOT NULL,
  `ticket_id` bigint UNSIGNED NOT NULL,
  `sender_identity_id` bigint UNSIGNED NOT NULL,
  `interaction_type` enum('MESSAGE','REQUEST_DETAIL','RESPONSE','INFORMATION','FOLLOW_UP') COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ticket_interaction`
--

INSERT INTO `ticket_interaction` (`interaction_id`, `ticket_id`, `sender_identity_id`, `interaction_type`, `message`, `created_at`) VALUES
(1, 2, 6, 'MESSAGE', 'ECU kendaraan bermasalah saat digunakan.', '2026-09-01 09:00:00'),
(2, 2, 4, 'REQUEST_DETAIL', 'Mohon foto ECU dan informasi error terakhir.', '2026-09-01 11:00:00'),
(3, 2, 6, 'RESPONSE', 'Foto sudah dikirim dan kendaraan tersedia untuk pemeriksaan.', '2026-09-01 11:30:00'),
(4, 4, 2, 'MESSAGE', 'Saya ingin mengajukan kursi kerja baru.', '2026-09-02 08:30:00'),
(5, 5, 3, 'MESSAGE', 'Wi-Fi lantai 2 tidak dapat digunakan.', '2026-08-28 08:20:00'),
(6, 5, 10, 'REQUEST_DETAIL', 'Mohon SSID dan lokasi perangkat.', '2026-08-28 09:15:00'),
(7, 5, 3, 'RESPONSE', 'Seluruh area lantai 2 terdampak.', '2026-08-28 09:30:00'),
(8, 6, 4, 'MESSAGE', 'Mohon akses aplikasi approval.', '2026-09-02 09:00:00'),
(9, 8, 14, 'MESSAGE', 'Mohon informasi jadwal maintenance.', '2026-09-02 14:00:00'),
(10, 10, 15, 'MESSAGE', 'Kendaraan terlambat pada jam sibuk.', '2026-08-27 07:45:00'),
(11, 12, 11, 'MESSAGE', 'Lampu area kerja mati.', '2026-09-01 10:30:00'),
(12, 15, 12, 'MESSAGE', 'Laptop handler tidak dapat menyala.', '2026-09-03 09:00:00'),
(13, 18, 3, 'MESSAGE', 'Printer jaringan tidak dapat terhubung.', '2026-09-03 11:00:00'),
(14, 20, 18, 'MESSAGE', 'Mohon nomor kontak layanan resmi.', '2026-09-02 15:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `ticket_relation`
--

CREATE TABLE `ticket_relation` (
  `relation_id` bigint UNSIGNED NOT NULL,
  `ticket_id` bigint UNSIGNED NOT NULL,
  `related_ticket_id` bigint UNSIGNED NOT NULL,
  `relation_type` enum('RECURRING_OF','DUPLICATE_OF','RELATED_TO','FOLLOW_UP_OF','CHILD_OF') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by_identity_id` bigint UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ticket_relation`
--

INSERT INTO `ticket_relation` (`relation_id`, `ticket_id`, `related_ticket_id`, `relation_type`, `created_by_identity_id`, `created_at`) VALUES
(1, 3, 2, 'RECURRING_OF', 3, '2026-09-03 16:42:15'),
(2, 9, 2, 'RELATED_TO', 3, '2026-09-03 16:42:15'),
(3, 12, 4, 'RELATED_TO', 5, '2026-09-03 16:42:15');

-- --------------------------------------------------------

--
-- Table structure for table `ticket_resolution`
--

CREATE TABLE `ticket_resolution` (
  `resolution_id` bigint UNSIGNED NOT NULL,
  `ticket_id` bigint UNSIGNED NOT NULL,
  `handler_assignment_id` bigint UNSIGNED NOT NULL,
  `resolution_no` int NOT NULL,
  `resolution_summary` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `resolution_detail` text COLLATE utf8mb4_unicode_ci,
  `submitted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ticket_resolution`
--

INSERT INTO `ticket_resolution` (`resolution_id`, `ticket_id`, `handler_assignment_id`, `resolution_no`, `resolution_summary`, `resolution_detail`, `submitted_at`) VALUES
(1, 1, 1, 1, 'Aplikasi kembali normal', 'Restart service dan perbaikan konfigurasi dilakukan.', '2026-09-01 15:30:00'),
(2, 2, 3, 1, 'ECU diperbaiki', 'ECU diperiksa dan dilakukan pengujian kendaraan.', '2026-09-02 14:00:00'),
(3, 5, 8, 1, 'Access point diganti', 'Access point diganti dan konektivitas diuji.', '2026-08-29 14:00:00'),
(4, 11, 20, 1, 'Monitor tambahan dipasang', 'Monitor dipasang dan diuji.', '2026-08-22 14:30:00');

-- --------------------------------------------------------

--
-- Table structure for table `ticket_review`
--

CREATE TABLE `ticket_review` (
  `review_id` bigint UNSIGNED NOT NULL,
  `ticket_id` bigint UNSIGNED NOT NULL,
  `reviewer_employee_id` bigint UNSIGNED NOT NULL,
  `review_type` enum('INITIAL','RESOLUTION','FINAL_CLOSURE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `decision` enum('ROUTE','REQUEST_REWORK','APPROVE','REJECT','CLOSE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `destination_department_id` bigint UNSIGNED DEFAULT NULL,
  `resolution_id` bigint UNSIGNED DEFAULT NULL,
  `review_notes` text COLLATE utf8mb4_unicode_ci,
  `reviewed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ticket_review`
--

INSERT INTO `ticket_review` (`review_id`, `ticket_id`, `reviewer_employee_id`, `review_type`, `decision`, `destination_department_id`, `resolution_id`, `review_notes`, `reviewed_at`) VALUES
(1, 1, 2, 'INITIAL', 'ROUTE', 2, NULL, 'Request/incident diarahkan ke IT.', '2026-09-01 08:20:00'),
(2, 1, 2, 'RESOLUTION', 'APPROVE', NULL, 1, 'Resolution diterima.', '2026-09-01 16:00:00'),
(3, 1, 1, 'FINAL_CLOSURE', 'CLOSE', NULL, 1, 'Final closure.', '2026-09-01 16:30:00'),
(4, 2, 3, 'INITIAL', 'ROUTE', 3, NULL, 'Complaint ECU diarahkan ke Teknik.', '2026-09-01 09:20:00'),
(5, 2, 3, 'RESOLUTION', 'APPROVE', NULL, 2, 'Resolution diterima.', '2026-09-02 16:00:00'),
(6, 2, 1, 'FINAL_CLOSURE', 'CLOSE', NULL, 2, 'Priority A ditutup Director Utama.', '2026-09-02 17:00:00'),
(7, 4, 2, 'INITIAL', 'ROUTE', 6, NULL, 'Request kursi diarahkan ke General Affairs.', '2026-09-02 09:00:00'),
(8, 5, 3, 'INITIAL', 'ROUTE', 2, NULL, 'Incident jaringan diarahkan ke IT.', '2026-08-28 09:00:00'),
(9, 5, 2, 'RESOLUTION', 'APPROVE', NULL, 3, 'Wi-Fi kembali normal.', '2026-08-29 16:00:00'),
(10, 7, 2, 'INITIAL', 'REJECT', NULL, NULL, 'Tidak dapat diproses melalui jalur ini.', '2026-08-26 10:30:00'),
(11, 8, 12, 'INITIAL', 'ROUTE', 7, NULL, 'Inquiry diteruskan ke Customer Service.', '2026-09-02 15:00:00'),
(12, 10, 6, 'INITIAL', 'ROUTE', 5, NULL, 'Complaint operasional diteruskan ke Operasional.', '2026-08-27 08:15:00'),
(13, 11, 2, 'INITIAL', 'ROUTE', 2, NULL, 'Request hardware diteruskan ke IT.', '2026-08-20 10:30:00'),
(14, 11, 2, 'RESOLUTION', 'APPROVE', NULL, 4, 'Resolution diterima.', '2026-08-22 15:30:00');

-- --------------------------------------------------------

--
-- Table structure for table `ticket_revision`
--

CREATE TABLE `ticket_revision` (
  `revision_id` bigint UNSIGNED NOT NULL,
  `ticket_id` bigint UNSIGNED NOT NULL,
  `revision_no` int NOT NULL,
  `created_by_identity_id` bigint UNSIGNED NOT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` bigint UNSIGNED DEFAULT NULL,
  `product_id` bigint UNSIGNED DEFAULT NULL,
  `category_id` bigint UNSIGNED NOT NULL,
  `ticket_type_id` bigint UNSIGNED NOT NULL,
  `priority_id` bigint UNSIGNED NOT NULL,
  `vehicle_id` bigint UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ticket_revision`
--

INSERT INTO `ticket_revision` (`revision_id`, `ticket_id`, `revision_no`, `created_by_identity_id`, `subject`, `description`, `customer_id`, `product_id`, `category_id`, `ticket_type_id`, `priority_id`, `vehicle_id`, `created_at`) VALUES
(1, 1, 1, 1, 'Aplikasi approval tidak dapat diakses', 'Aplikasi approval tidak dapat diakses sejak pagi.', NULL, NULL, 12, 2, 2, NULL, '2026-09-01 08:00:00'),
(2, 2, 1, 6, 'Keluhan ECU kendaraan bermasalah', 'Customer melaporkan ECU Juken bermasalah ketika kendaraan digunakan.', 1, 1, 8, 3, 1, 1, '2026-09-01 09:00:00'),
(3, 2, 2, 3, 'Keluhan ECU kendaraan bermasalah', 'Reviewer mengonfirmasi masalah ECU dan meminta pemeriksaan teknis.', 1, 1, 8, 3, 1, 1, '2026-09-01 09:20:00'),
(4, 3, 1, 6, 'ECU kembali bermasalah', 'Customer melaporkan masalah serupa kembali terjadi.', 1, 1, 8, 2, 3, 1, '2026-09-03 08:00:00'),
(5, 12, 1, 11, 'Permintaan perbaikan lampu', 'Lampu area kerja mati dan membutuhkan tindak lanjut.', NULL, NULL, 9, 1, 3, NULL, '2026-09-01 10:30:00'),
(6, 12, 2, 12, 'Permintaan perbaikan lampu', 'Material lampu belum tersedia; menunggu pengadaan sebelum dapat ditindaklanjuti.', NULL, NULL, 9, 1, 3, NULL, '2026-09-03 09:00:00'),
(7, 18, 1, 3, 'Gangguan printer jaringan', 'Printer jaringan tidak dapat terhubung.', NULL, NULL, 11, 2, 3, NULL, '2026-09-03 11:00:00'),
(8, 18, 2, 3, 'Gangguan printer jaringan', 'Menunggu informasi konfigurasi tambahan dari pelapor sebelum dapat ditindaklanjuti oleh Teknik.', NULL, NULL, 11, 2, 3, NULL, '2026-09-03 14:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `ticket_status`
--

CREATE TABLE `ticket_status` (
  `status_id` bigint UNSIGNED NOT NULL,
  `status_code` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_terminal` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ticket_status`
--

INSERT INTO `ticket_status` (`status_id`, `status_code`, `status_name`, `description`, `is_terminal`, `sort_order`, `is_active`) VALUES
(1, 'OPEN', 'Open', 'Tiket baru dibuat.', 0, 1, 1),
(2, 'IN_PROGRESS', 'In Progress', 'Tiket sedang ditangani.', 0, 2, 1),
(3, 'PENDING_REVIEW', 'Pending Review', 'Menunggu review.', 0, 3, 1),
(4, 'REWORK_REQUIRED', 'Rework Required', 'Perlu perbaikan/tindak lanjut ulang.', 0, 4, 1),
(5, 'REJECTED', 'Rejected', 'Tiket ditolak dan selesai.', 1, 5, 1),
(6, 'CLOSED', 'Closed', 'Tiket selesai.', 1, 6, 1);

-- --------------------------------------------------------

--
-- Table structure for table `ticket_type`
--

CREATE TABLE `ticket_type` (
  `ticket_type_id` bigint UNSIGNED NOT NULL,
  `ticket_type_code` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ticket_type_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ticket_type`
--

INSERT INTO `ticket_type` (`ticket_type_id`, `ticket_type_code`, `ticket_type_name`, `description`, `is_active`) VALUES
(1, 'REQUEST', 'Request', 'Permintaan barang, layanan, akses atau fasilitas.', 1),
(2, 'INCIDENT', 'Incident', 'Gangguan/kejadian yang menyebabkan layanan bermasalah.', 1),
(3, 'COMPLAINT', 'Complaint', 'Keluhan atau ketidakpuasan.', 1),
(4, 'INQUIRY', 'Inquiry', 'Pertanyaan atau permintaan informasi.', 1);

-- --------------------------------------------------------

--
-- Table structure for table `vehicle`
--

CREATE TABLE `vehicle` (
  `vehicle_id` bigint UNSIGNED NOT NULL,
  `wansis_vehicle_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `plate_number` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `frame_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vehicle_model` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `synced_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `vehicle`
--

INSERT INTO `vehicle` (`vehicle_id`, `wansis_vehicle_id`, `plate_number`, `frame_number`, `vehicle_model`, `synced_at`, `is_active`) VALUES
(1, 'WNS-VEH-0001', 'B 1001 BRT', 'FRM-0001', 'BRT Bus Urban 12M', '2026-09-03 07:00:00', 1),
(2, 'WNS-VEH-0002', 'B 1002 BRT', 'FRM-0002', 'BRT Bus Urban 12M', '2026-09-03 07:00:00', 1),
(3, 'WNS-VEH-0003', 'B 1003 BRT', 'FRM-0003', 'BRT Bus Urban 10M', '2026-09-03 07:00:00', 1),
(4, 'WNS-VEH-0004', 'B 1004 BRT', 'FRM-0004', 'BRT Bus Urban 10M', '2026-09-03 07:00:00', 1),
(5, 'WNS-VEH-0005', 'B 1005 BRT', 'FRM-0005', 'BRT Bus Urban 12M', '2026-09-03 07:00:00', 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `account`
--
ALTER TABLE `account`
  ADD PRIMARY KEY (`account_id`),
  ADD UNIQUE KEY `uk_account_identity` (`identity_id`);

--
-- Indexes for table `account_token`
--
ALTER TABLE `account_token`
  ADD PRIMARY KEY (`token_id`),
  ADD KEY `fk_account_token_account` (`account_id`),
  ADD KEY `fk_account_token_requester` (`requested_by_employee_id`);

--
-- Indexes for table `category`
--
ALTER TABLE `category`
  ADD PRIMARY KEY (`category_id`),
  ADD UNIQUE KEY `uk_category_code` (`category_code`),
  ADD KEY `fk_category_parent` (`parent_category_id`);

--
-- Indexes for table `customer`
--
ALTER TABLE `customer`
  ADD PRIMARY KEY (`customer_id`),
  ADD UNIQUE KEY `uk_customer_identity` (`identity_id`);

--
-- Indexes for table `department`
--
ALTER TABLE `department`
  ADD PRIMARY KEY (`department_id`),
  ADD UNIQUE KEY `uk_department_code` (`department_code`),
  ADD KEY `fk_department_parent` (`parent_department_id`);

--
-- Indexes for table `employee`
--
ALTER TABLE `employee`
  ADD PRIMARY KEY (`employee_id`),
  ADD UNIQUE KEY `uk_employee_identity` (`identity_id`),
  ADD UNIQUE KEY `uk_employee_no` (`employee_no`),
  ADD KEY `fk_employee_department` (`department_id`),
  ADD KEY `fk_employee_position` (`position_id`);

--
-- Indexes for table `employee_role`
--
ALTER TABLE `employee_role`
  ADD PRIMARY KEY (`employee_id`,`role_id`),
  ADD KEY `fk_employee_role_role` (`role_id`),
  ADD KEY `fk_employee_role_assigned_by` (`assigned_by_employee_id`);

--
-- Indexes for table `identity`
--
ALTER TABLE `identity`
  ADD PRIMARY KEY (`identity_id`),
  ADD UNIQUE KEY `uk_identity_phone` (`phone_number`);

--
-- Indexes for table `otp_verification`
--
ALTER TABLE `otp_verification`
  ADD PRIMARY KEY (`otp_id`),
  ADD KEY `fk_otp_identity` (`identity_id`);

--
-- Indexes for table `position`
--
ALTER TABLE `position`
  ADD PRIMARY KEY (`position_id`),
  ADD UNIQUE KEY `uk_position_code` (`position_code`);

--
-- Indexes for table `priority`
--
ALTER TABLE `priority`
  ADD PRIMARY KEY (`priority_id`),
  ADD UNIQUE KEY `uk_priority_code` (`priority_code`);

--
-- Indexes for table `product`
--
ALTER TABLE `product`
  ADD PRIMARY KEY (`product_id`),
  ADD UNIQUE KEY `uk_product_code` (`product_code`);

--
-- Indexes for table `role`
--
ALTER TABLE `role`
  ADD PRIMARY KEY (`role_id`),
  ADD UNIQUE KEY `uk_role_code` (`role_code`);

--
-- Indexes for table `ticket`
--
ALTER TABLE `ticket`
  ADD PRIMARY KEY (`ticket_id`),
  ADD UNIQUE KEY `uk_ticket_no` (`ticket_no`),
  ADD KEY `fk_ticket_reporter` (`reporter_identity_id`),
  ADD KEY `fk_ticket_customer` (`customer_id`),
  ADD KEY `fk_ticket_product` (`product_id`),
  ADD KEY `fk_ticket_category` (`category_id`),
  ADD KEY `fk_ticket_type` (`ticket_type_id`),
  ADD KEY `fk_ticket_priority` (`priority_id`),
  ADD KEY `fk_ticket_status` (`status_id`),
  ADD KEY `fk_ticket_vehicle` (`vehicle_id`);

--
-- Indexes for table `ticket_activity`
--
ALTER TABLE `ticket_activity`
  ADD PRIMARY KEY (`activity_id`),
  ADD KEY `fk_activity_ticket` (`ticket_id`),
  ADD KEY `fk_activity_actor` (`actor_identity_id`),
  ADD KEY `fk_activity_old_status` (`old_status_id`),
  ADD KEY `fk_activity_new_status` (`new_status_id`);

--
-- Indexes for table `ticket_assignment`
--
ALTER TABLE `ticket_assignment`
  ADD PRIMARY KEY (`assignment_id`),
  ADD KEY `fk_assignment_ticket` (`ticket_id`),
  ADD KEY `fk_assignment_employee` (`assigned_to_employee_id`),
  ADD KEY `fk_assignment_by` (`assigned_by_identity_id`);

--
-- Indexes for table `ticket_attachment`
--
ALTER TABLE `ticket_attachment`
  ADD PRIMARY KEY (`attachment_id`),
  ADD KEY `fk_attachment_ticket` (`ticket_id`),
  ADD KEY `fk_attachment_interaction` (`interaction_id`),
  ADD KEY `fk_attachment_resolution` (`resolution_id`),
  ADD KEY `fk_attachment_uploader` (`uploaded_by_identity_id`);

--
-- Indexes for table `ticket_interaction`
--
ALTER TABLE `ticket_interaction`
  ADD PRIMARY KEY (`interaction_id`),
  ADD KEY `fk_interaction_ticket` (`ticket_id`),
  ADD KEY `fk_interaction_sender` (`sender_identity_id`);

--
-- Indexes for table `ticket_relation`
--
ALTER TABLE `ticket_relation`
  ADD PRIMARY KEY (`relation_id`),
  ADD UNIQUE KEY `uk_ticket_relation` (`ticket_id`,`related_ticket_id`,`relation_type`),
  ADD KEY `fk_relation_related_ticket` (`related_ticket_id`),
  ADD KEY `fk_relation_creator` (`created_by_identity_id`);

--
-- Indexes for table `ticket_resolution`
--
ALTER TABLE `ticket_resolution`
  ADD PRIMARY KEY (`resolution_id`),
  ADD UNIQUE KEY `uk_resolution_no` (`ticket_id`,`resolution_no`),
  ADD KEY `fk_resolution_assignment` (`handler_assignment_id`);

--
-- Indexes for table `ticket_review`
--
ALTER TABLE `ticket_review`
  ADD PRIMARY KEY (`review_id`),
  ADD KEY `fk_review_ticket` (`ticket_id`),
  ADD KEY `fk_review_reviewer` (`reviewer_employee_id`),
  ADD KEY `fk_review_department` (`destination_department_id`),
  ADD KEY `fk_review_resolution` (`resolution_id`);

--
-- Indexes for table `ticket_revision`
--
ALTER TABLE `ticket_revision`
  ADD PRIMARY KEY (`revision_id`),
  ADD UNIQUE KEY `uk_ticket_revision` (`ticket_id`,`revision_no`),
  ADD KEY `fk_revision_creator` (`created_by_identity_id`),
  ADD KEY `fk_revision_customer` (`customer_id`),
  ADD KEY `fk_revision_product` (`product_id`),
  ADD KEY `fk_revision_category` (`category_id`),
  ADD KEY `fk_revision_type` (`ticket_type_id`),
  ADD KEY `fk_revision_priority` (`priority_id`),
  ADD KEY `fk_revision_vehicle` (`vehicle_id`);

--
-- Indexes for table `ticket_status`
--
ALTER TABLE `ticket_status`
  ADD PRIMARY KEY (`status_id`),
  ADD UNIQUE KEY `uk_status_code` (`status_code`);

--
-- Indexes for table `ticket_type`
--
ALTER TABLE `ticket_type`
  ADD PRIMARY KEY (`ticket_type_id`),
  ADD UNIQUE KEY `uk_ticket_type_code` (`ticket_type_code`);

--
-- Indexes for table `vehicle`
--
ALTER TABLE `vehicle`
  ADD PRIMARY KEY (`vehicle_id`),
  ADD UNIQUE KEY `uk_wansis_vehicle` (`wansis_vehicle_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `account`
--
ALTER TABLE `account`
  MODIFY `account_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `account_token`
--
ALTER TABLE `account_token`
  MODIFY `token_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `category`
--
ALTER TABLE `category`
  MODIFY `category_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `customer`
--
ALTER TABLE `customer`
  MODIFY `customer_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `department`
--
ALTER TABLE `department`
  MODIFY `department_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `employee`
--
ALTER TABLE `employee`
  MODIFY `employee_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `identity`
--
ALTER TABLE `identity`
  MODIFY `identity_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `otp_verification`
--
ALTER TABLE `otp_verification`
  MODIFY `otp_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `position`
--
ALTER TABLE `position`
  MODIFY `position_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `priority`
--
ALTER TABLE `priority`
  MODIFY `priority_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `product`
--
ALTER TABLE `product`
  MODIFY `product_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `role`
--
ALTER TABLE `role`
  MODIFY `role_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `ticket`
--
ALTER TABLE `ticket`
  MODIFY `ticket_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `ticket_activity`
--
ALTER TABLE `ticket_activity`
  MODIFY `activity_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=60;

--
-- AUTO_INCREMENT for table `ticket_assignment`
--
ALTER TABLE `ticket_assignment`
  MODIFY `assignment_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `ticket_attachment`
--
ALTER TABLE `ticket_attachment`
  MODIFY `attachment_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `ticket_interaction`
--
ALTER TABLE `ticket_interaction`
  MODIFY `interaction_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `ticket_relation`
--
ALTER TABLE `ticket_relation`
  MODIFY `relation_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `ticket_resolution`
--
ALTER TABLE `ticket_resolution`
  MODIFY `resolution_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `ticket_review`
--
ALTER TABLE `ticket_review`
  MODIFY `review_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `ticket_revision`
--
ALTER TABLE `ticket_revision`
  MODIFY `revision_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `ticket_status`
--
ALTER TABLE `ticket_status`
  MODIFY `status_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `ticket_type`
--
ALTER TABLE `ticket_type`
  MODIFY `ticket_type_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `vehicle`
--
ALTER TABLE `vehicle`
  MODIFY `vehicle_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `account`
--
ALTER TABLE `account`
  ADD CONSTRAINT `fk_account_identity` FOREIGN KEY (`identity_id`) REFERENCES `identity` (`identity_id`);

--
-- Constraints for table `account_token`
--
ALTER TABLE `account_token`
  ADD CONSTRAINT `fk_account_token_account` FOREIGN KEY (`account_id`) REFERENCES `account` (`account_id`),
  ADD CONSTRAINT `fk_account_token_requester` FOREIGN KEY (`requested_by_employee_id`) REFERENCES `employee` (`employee_id`);

--
-- Constraints for table `category`
--
ALTER TABLE `category`
  ADD CONSTRAINT `fk_category_parent` FOREIGN KEY (`parent_category_id`) REFERENCES `category` (`category_id`);

--
-- Constraints for table `customer`
--
ALTER TABLE `customer`
  ADD CONSTRAINT `fk_customer_identity` FOREIGN KEY (`identity_id`) REFERENCES `identity` (`identity_id`);

--
-- Constraints for table `department`
--
ALTER TABLE `department`
  ADD CONSTRAINT `fk_department_parent` FOREIGN KEY (`parent_department_id`) REFERENCES `department` (`department_id`);

--
-- Constraints for table `employee`
--
ALTER TABLE `employee`
  ADD CONSTRAINT `fk_employee_department` FOREIGN KEY (`department_id`) REFERENCES `department` (`department_id`),
  ADD CONSTRAINT `fk_employee_identity` FOREIGN KEY (`identity_id`) REFERENCES `identity` (`identity_id`),
  ADD CONSTRAINT `fk_employee_position` FOREIGN KEY (`position_id`) REFERENCES `position` (`position_id`);

--
-- Constraints for table `employee_role`
--
ALTER TABLE `employee_role`
  ADD CONSTRAINT `fk_employee_role_assigned_by` FOREIGN KEY (`assigned_by_employee_id`) REFERENCES `employee` (`employee_id`),
  ADD CONSTRAINT `fk_employee_role_employee` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`employee_id`),
  ADD CONSTRAINT `fk_employee_role_role` FOREIGN KEY (`role_id`) REFERENCES `role` (`role_id`);

--
-- Constraints for table `otp_verification`
--
ALTER TABLE `otp_verification`
  ADD CONSTRAINT `fk_otp_identity` FOREIGN KEY (`identity_id`) REFERENCES `identity` (`identity_id`);

--
-- Constraints for table `ticket`
--
ALTER TABLE `ticket`
  ADD CONSTRAINT `fk_ticket_category` FOREIGN KEY (`category_id`) REFERENCES `category` (`category_id`),
  ADD CONSTRAINT `fk_ticket_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`),
  ADD CONSTRAINT `fk_ticket_priority` FOREIGN KEY (`priority_id`) REFERENCES `priority` (`priority_id`),
  ADD CONSTRAINT `fk_ticket_product` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`),
  ADD CONSTRAINT `fk_ticket_reporter` FOREIGN KEY (`reporter_identity_id`) REFERENCES `identity` (`identity_id`),
  ADD CONSTRAINT `fk_ticket_status` FOREIGN KEY (`status_id`) REFERENCES `ticket_status` (`status_id`),
  ADD CONSTRAINT `fk_ticket_type` FOREIGN KEY (`ticket_type_id`) REFERENCES `ticket_type` (`ticket_type_id`),
  ADD CONSTRAINT `fk_ticket_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle` (`vehicle_id`);

--
-- Constraints for table `ticket_activity`
--
ALTER TABLE `ticket_activity`
  ADD CONSTRAINT `fk_activity_actor` FOREIGN KEY (`actor_identity_id`) REFERENCES `identity` (`identity_id`),
  ADD CONSTRAINT `fk_activity_new_status` FOREIGN KEY (`new_status_id`) REFERENCES `ticket_status` (`status_id`),
  ADD CONSTRAINT `fk_activity_old_status` FOREIGN KEY (`old_status_id`) REFERENCES `ticket_status` (`status_id`),
  ADD CONSTRAINT `fk_activity_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `ticket` (`ticket_id`);

--
-- Constraints for table `ticket_assignment`
--
ALTER TABLE `ticket_assignment`
  ADD CONSTRAINT `fk_assignment_by` FOREIGN KEY (`assigned_by_identity_id`) REFERENCES `identity` (`identity_id`),
  ADD CONSTRAINT `fk_assignment_employee` FOREIGN KEY (`assigned_to_employee_id`) REFERENCES `employee` (`employee_id`),
  ADD CONSTRAINT `fk_assignment_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `ticket` (`ticket_id`);

--
-- Constraints for table `ticket_attachment`
--
ALTER TABLE `ticket_attachment`
  ADD CONSTRAINT `fk_attachment_interaction` FOREIGN KEY (`interaction_id`) REFERENCES `ticket_interaction` (`interaction_id`),
  ADD CONSTRAINT `fk_attachment_resolution` FOREIGN KEY (`resolution_id`) REFERENCES `ticket_resolution` (`resolution_id`),
  ADD CONSTRAINT `fk_attachment_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `ticket` (`ticket_id`),
  ADD CONSTRAINT `fk_attachment_uploader` FOREIGN KEY (`uploaded_by_identity_id`) REFERENCES `identity` (`identity_id`);

--
-- Constraints for table `ticket_interaction`
--
ALTER TABLE `ticket_interaction`
  ADD CONSTRAINT `fk_interaction_sender` FOREIGN KEY (`sender_identity_id`) REFERENCES `identity` (`identity_id`),
  ADD CONSTRAINT `fk_interaction_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `ticket` (`ticket_id`);

--
-- Constraints for table `ticket_relation`
--
ALTER TABLE `ticket_relation`
  ADD CONSTRAINT `fk_relation_creator` FOREIGN KEY (`created_by_identity_id`) REFERENCES `identity` (`identity_id`),
  ADD CONSTRAINT `fk_relation_related_ticket` FOREIGN KEY (`related_ticket_id`) REFERENCES `ticket` (`ticket_id`),
  ADD CONSTRAINT `fk_relation_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `ticket` (`ticket_id`);

--
-- Constraints for table `ticket_resolution`
--
ALTER TABLE `ticket_resolution`
  ADD CONSTRAINT `fk_resolution_assignment` FOREIGN KEY (`handler_assignment_id`) REFERENCES `ticket_assignment` (`assignment_id`),
  ADD CONSTRAINT `fk_resolution_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `ticket` (`ticket_id`);

--
-- Constraints for table `ticket_review`
--
ALTER TABLE `ticket_review`
  ADD CONSTRAINT `fk_review_department` FOREIGN KEY (`destination_department_id`) REFERENCES `department` (`department_id`),
  ADD CONSTRAINT `fk_review_resolution` FOREIGN KEY (`resolution_id`) REFERENCES `ticket_resolution` (`resolution_id`),
  ADD CONSTRAINT `fk_review_reviewer` FOREIGN KEY (`reviewer_employee_id`) REFERENCES `employee` (`employee_id`),
  ADD CONSTRAINT `fk_review_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `ticket` (`ticket_id`);

--
-- Constraints for table `ticket_revision`
--
ALTER TABLE `ticket_revision`
  ADD CONSTRAINT `fk_revision_category` FOREIGN KEY (`category_id`) REFERENCES `category` (`category_id`),
  ADD CONSTRAINT `fk_revision_creator` FOREIGN KEY (`created_by_identity_id`) REFERENCES `identity` (`identity_id`),
  ADD CONSTRAINT `fk_revision_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`),
  ADD CONSTRAINT `fk_revision_priority` FOREIGN KEY (`priority_id`) REFERENCES `priority` (`priority_id`),
  ADD CONSTRAINT `fk_revision_product` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`),
  ADD CONSTRAINT `fk_revision_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `ticket` (`ticket_id`),
  ADD CONSTRAINT `fk_revision_type` FOREIGN KEY (`ticket_type_id`) REFERENCES `ticket_type` (`ticket_type_id`),
  ADD CONSTRAINT `fk_revision_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle` (`vehicle_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
