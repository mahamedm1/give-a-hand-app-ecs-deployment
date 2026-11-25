variable "vpc_name"{
    type = string
    description = "Name of the VPC"
}

variable "vpc_cidr_block"{
    type = string
    description = "Cidr block range for the VPC"
}

variable "availability_zones" {
    type = list(string)
    description = "Availability Zones for the VPC Subnets"
}

variable "subnet_names" {
    type = list(string)
    description = "Names for the VPC Subnets"
}

variable "subnet_cidrs"{
    type = list(string)
    description = "Cidr ranges for the Subnets"
}

variable "igw_name"{
    type = string
    description = "Name for the Internet Gateway"
}

variable "igw_cidr"{
    type = string
    description = "CIDR block for the Internet Gateway"
    default = "0.0.0.0/0"
}

variable "route_table_name"{
    type = string
    description = "Name for the Route Table"
}

