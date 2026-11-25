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
    description = "Availability Zones for the VPC subnets"
}

variable "subnet_names" {
    type = list(string)
    description = "Names for the VPC subnets"
}

variable "subnets_cidrs"{
    type = list(string)
    description = "Cidr ranges for the subnets"
}