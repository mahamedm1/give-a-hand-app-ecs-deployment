variable "vpc_name" {
  type        = string
  description = "Name of the VPC"
}

variable "vpc_cidr_block" {
  type        = string
  description = "CIDR block range for the VPC"
}

variable "availability_zones" {
  type        = list(string)
  description = "Availability Zones for the VPC subnets"
}

variable "subnet_names" {
  type        = list(string)
  description = "Names for the VPC subnets"
}

variable "subnet_cidrs" {
  type        = list(string)
  description = "CIDR ranges for the subnets"
}

variable "igw_name" {
  type        = string
  description = "Name for the Internet Gateway"
}

variable "route_table_name" {
  type        = string
  description = "Name for the route table"
}