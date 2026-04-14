module my_first_package::garage {


    public struct Car has key {
        id: UID,
        speed: u64,
        color: u64, // 1 for Red, 2 for Blue
    }
// Constants for error codes (Best practice for memory!)
    const ECarNotReady: u64 = 0;

    public fun race(car1: &Car, car2: &Car): u64 {
        // --- YOUR CODE HERE ---
        // Check if cars are ready (speed > 0)
        assert!(car1.speed > 0 && car2.speed > 0 , ECarNotReady);
        // Compare speeds and return the winner's speed
        if (car1.speed > car2.speed) {
            car1.speed
        } else {
            car2.speed
        }
    }
    // ENTRY: Anyone can call this to get a car
    public entry fun collect_car(ctx: &mut TxContext) {
        let new_car = Car { id: object::new(ctx), speed: 0, color: 1 };
        transfer::transfer(new_car, tx_context::sender(ctx));
    }

    // READ-ONLY: Anyone can look at the speed (&Car)
    public fun check_speed(car: &Car): u64 {
        car.speed
    }

    // MUTABLE: Change the color (&mut Car)
    public entry fun paint_car(car: &mut Car, new_color: u64) {
        car.color = new_color;
    }
}