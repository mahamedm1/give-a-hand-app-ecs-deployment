variable "alb_name" {
  type        = string
  description = "Name for the ALB"
}

variable "alb_sg_id" {
    type = string
    description = "ID of the ALB Security Group"
}

variable "subnet_ids" {
    type = list(string)
    description = "ID of the subnets"
}
