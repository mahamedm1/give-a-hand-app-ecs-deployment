variable "vpc_name" {
  type        = string
  description = "Name of the VPC"
}

variable "vpc_cidr_block" {
  type        = string
  description = "Cidr block range for the VPC"
}

variable "availability_zones" {
  type        = list(string)
  description = "Availability Zones for the VPC Subnets"
}

variable "public_subnet_names" {
  type        = list(string)
  description = "Names for the VPC Subnets"
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "Cidr ranges for the Subnets"
}

variable "private_subnet_names" {
  type        = list(string)
  description = "Names for the VPC Private Subnets"
}

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "Cidr ranges for the Private Subnets"
}

variable "igw_name" {
  type        = string
  description = "Name for the Internet Gateway"
}

variable "default_route" {
  type        = string
  description = "CIDR block for the default route"
  default     = "0.0.0.0/0"
}

variable "nat_gateway_name" {
  type        = string
  description = "Name for the NAT Gateway"
}

variable "default_route_table_name" {
  type        = string
  description = "Name for the default Route Table"
}

variable "nat_route_table_name" {
  type        = string
  description = "Name for the NAT Route Table"
}